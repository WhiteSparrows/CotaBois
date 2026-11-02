# Generates build/icon.ico and build/icon.png: an open cabinet seen in isometric view.
# Usage: powershell -NoProfile -File scripts/make-icon.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

function New-Color([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

function New-IconBitmap([int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded background
  $radius = $size * 0.2
  $d = $radius * 2
  $max = $size - 1
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($max - $d, 0, $d, $d, 270, 90)
  $path.AddArc($max - $d, $max - $d, $d, $d, 0, 90)
  $path.AddArc(0, $max - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush(New-Color '#26352C')), $path)

  # Isometric projection of the cabinet
  $w = 1.0; $h = 1.25; $depth = 0.6; $e = 0.09
  $a = 0.40 * $size; $b = 0.20 * $size; $c = 0.46 * $size
  $cx = 0.5 * $size - ($w - $depth) * $a / 2
  $cy = 0.5 * $size - ($w + $depth) * $b / 2 + $h * $c / 2
  $project = {
    param([double]$x, [double]$y, [double]$z)
    New-Object System.Drawing.PointF(([single]($cx + ($x - $z) * $a)), ([single]($cy + ($x + $z) * $b - $y * $c)))
  }
  $front = {
    param([double]$x0, [double]$y0, [double]$x1, [double]$y1, [string]$color)
    [System.Drawing.PointF[]]$points = @(
      (& $project $x0 $y0 $depth), (& $project $x1 $y0 $depth), (& $project $x1 $y1 $depth), (& $project $x0 $y1 $depth)
    )
    $g.FillPolygon((New-Object System.Drawing.SolidBrush(New-Color $color)), $points)
  }

  # Right side, top, front rim
  [System.Drawing.PointF[]]$right = @((& $project $w 0 $depth), (& $project $w 0 0), (& $project $w $h 0), (& $project $w $h $depth))
  $g.FillPolygon((New-Object System.Drawing.SolidBrush(New-Color '#B07C3C')), $right)
  [System.Drawing.PointF[]]$top = @((& $project 0 $h $depth), (& $project $w $h $depth), (& $project $w $h 0), (& $project 0 $h 0))
  $g.FillPolygon((New-Object System.Drawing.SolidBrush(New-Color '#EBC88F')), $top)
  & $front 0 0 $w $h '#D9A860'

  # Interior and shelves
  & $front $e $e ($w - $e) ($h - $e) '#5C3D1E'
  & $front $e 0.43 ($w - $e) (0.43 + $e) '#D9A860'
  & $front $e 0.78 ($w - $e) (0.78 + $e) '#D9A860'

  $g.Dispose()
  $bitmap
}

$sizes = 16, 24, 32, 48, 64, 128, 256
$images = foreach ($size in $sizes) {
  $bitmap = New-IconBitmap $size
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  if ($size -eq 256) { $bitmap.Save((Join-Path $buildDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
  $bitmap.Dispose()
  , $stream.ToArray()
}

# ICO container with PNG entries
$output = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($output)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $dimension = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
  $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
  $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([uint16]1); $writer.Write([uint16]32)
  $writer.Write([uint32]$images[$i].Length); $writer.Write([uint32]$offset)
  $offset += $images[$i].Length
}
foreach ($image in $images) { $writer.Write([byte[]]$image) }
[System.IO.File]::WriteAllBytes((Join-Path $buildDir 'icon.ico'), $output.ToArray())
$writer.Dispose()
