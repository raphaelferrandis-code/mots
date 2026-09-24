# Reproduit les SVG à partir de Playfair Display Italic, déjà livrée avec le site.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $root 'public/identite'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$fontPath = & node (Join-Path $PSScriptRoot 'police-logo.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Impossible de préparer Playfair Display' }
$typeface = [System.Windows.Media.Typeface]::new(
    [System.Windows.Media.FontFamily]::new([uri]$fontPath, './#Playfair Display'),
    [System.Windows.FontStyles]::Italic,
    [System.Windows.FontWeights]::Normal,
    [System.Windows.FontStretches]::Normal
)
$resolvedFont = $null
if (-not $typeface.TryGetGlyphTypeface([ref]$resolvedFont) -or $resolvedFont.FontUri.LocalPath -ine $fontPath) {
    throw 'Playfair Display doit être chargée sans police de substitution'
}
function Number($value) { $value.ToString('0.###', $culture) }
function Outline($text) {
    $formatted = [System.Windows.Media.FormattedText]::new(
        $text, $culture, [System.Windows.FlowDirection]::LeftToRight,
        $typeface, 1000, [System.Windows.Media.Brushes]::Black, 1.0
    )
    $geometry = [System.Windows.Media.PathGeometry]::CreateFromGeometry(
        $formatted.BuildGeometry([System.Windows.Point]::new(0, 0))
    )
    $data = $geometry.ToString($culture) -replace '^F[01]', ''
    $data = [regex]::Replace($data, '-?\d+\.\d+', {
        param($match)
        Number ([double]::Parse($match.Value, $culture))
    })
    @{ Data = $data; Bounds = $geometry.Bounds }
}
function SaveSvg($name, $viewBox, $body, $title) {
    $svg = "<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"$viewBox`" role=`"img`" aria-labelledby=`"titre`"><title id=`"titre`">$title</title>$body</svg>"
    [System.IO.File]::WriteAllText((Join-Path $destination $name), $svg, [System.Text.UTF8Encoding]::new($false))
}
$word = Outline 'philamots'
$b = $word.Bounds
$margin = 30
$wordBox = "$(Number ($b.X - $margin)) $(Number ($b.Y - $margin)) $(Number ($b.Width + 2 * $margin)) $(Number ($b.Height + 2 * $margin))"
SaveSvg 'philamots-brun.svg' $wordBox "<path fill=`"#352219`" d=`"$($word.Data)`"/>" 'philamots'
SaveSvg 'philamots-creme.svg' $wordBox "<path fill=`"#F5F1E8`" d=`"$($word.Data)`"/>" 'philamots'
SaveSvg 'philamots-clair.svg' $wordBox "<path fill=`"#E0EDFA`" d=`"$($word.Data)`"/>" 'philamots'
SaveSvg 'philamots-noir.svg' $wordBox "<path fill=`"#000000`" d=`"$($word.Data)`"/>" 'philamots'
$p = Outline 'p'
$b = $p.Bounds
$side = [Math]::Max($b.Width, $b.Height) * 1.25
$scale = 64 / $side
$tx = 32 - ($b.X + $b.Width / 2) * $scale
$ty = 32 - ($b.Y + $b.Height / 2) * $scale
$transform = "translate($(Number $tx) $(Number $ty)) scale($(Number $scale))"
$mark = "<path transform=`"$transform`" d=`"$($p.Data)`"/>"
SaveSvg 'monogramme-brun.svg' '0 0 64 64' "<g fill=`"#352219`">$mark</g>" 'philamots — monogramme p'
# Un peu plus de matière pour conserver les déliés à 16 pixels.
$icon = "<rect width=`"64`" height=`"64`" rx=`"12`" fill=`"#F5F1E8`"/><g fill=`"#352219`" stroke=`"#352219`" stroke-width=`"7`" stroke-linejoin=`"round`">$mark</g>"
SaveSvg 'favicon.svg' '0 0 64 64' $icon 'philamots'
$siteIcon = "<rect width=`"64`" height=`"64`" rx=`"12`" fill=`"#0B1729`"/><g fill=`"#E0EDFA`" stroke=`"#E0EDFA`" stroke-width=`"7`" stroke-linejoin=`"round`">$mark</g>"
SaveSvg 'favicon-site.svg' '0 0 64 64' $siteIcon 'philamots'
Write-Output "Logo et monogramme créés dans $destination"
