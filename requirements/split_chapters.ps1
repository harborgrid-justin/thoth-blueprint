$inputFile = "f:\AutoCAD Competitor\requirements\autocad_aca_user_guide_english.txt"
$outputDir = "f:\AutoCAD Competitor\requirements"

Write-Host "Reading file..."
$lines = Get-Content $inputFile

$currentChapter = "0"
$chapterLines = @{}

Write-Host "Processing $($lines.Count) lines..."
foreach ($line in $lines) {
    $skip = $false

    # Check if line is a chapter header/footer (e.g., '48 | Chapter 2 The Workspace' or 'Chapter 2 The Workspace | 49')
    if ($line -match '^\s*\d+\s*\|\s*Chapter\s+(\d+)') {
        $currentChapter = $matches[1]
        $skip = $true
    } elseif ($line -match '^\s*Chapter\s+(\d+).*?\|\s*\d+\s*$') {
        $currentChapter = $matches[1]
        $skip = $true
    }
    # Check if line is a generic section header/footer (e.g., 'Opening the Tool Palettes Set | 81')
    elseif ($line -match '^\s*\d+\s*\|(?!.*\|)') { # Start with number | and no other |
        $skip = $true
    } elseif ($line -match '\|(?!.*\|)\s*\d+\s*$') { # End with | number and no other |
        $skip = $true
    }

    if (-not $skip) {
        if (-not $chapterLines.ContainsKey($currentChapter)) {
            $chapterLines[$currentChapter] = [System.Collections.Generic.List[string]]::new()
        }
        $chapterLines[$currentChapter].Add($line)
    }
}

Write-Host "Writing output files..."
foreach ($key in $chapterLines.Keys) {
    $name = if ($key -eq "0") { "frontmatter" } else { "chapter_$key" }
    $outFile = Join-Path $outputDir "$name.txt"
    [System.IO.File]::WriteAllLines($outFile, $chapterLines[$key].ToArray())
    Write-Host "Created $name.txt with $($chapterLines[$key].Count) lines"
}

Write-Host "Done!"
