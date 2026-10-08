Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pdfRoot = (Resolve-Path -LiteralPath (Join-Path $repo 'output/pdf')).Path
$blueprintRoot = (Resolve-Path -LiteralPath (Join-Path $repo 'content/theme-design')).Path
$recordTemplate = Get-Content -LiteralPath (Join-Path $blueprintRoot 'pilot-record-template.md') -Raw -Encoding UTF8

$themes = @(
  @{ Key = 'celebration'; Name = 'Celebration'; Home = 'H01'; Classroom = 'C01'; HomeStory = '寻找小狐狸留下的庆祝宝箱线索'; ClassroomStory = '合作完成探险俱乐部徽章' },
  @{ Key = 'dinosaur'; Name = 'Dinosaur'; Home = 'H02'; Classroom = 'C02'; HomeStory = '帮小恐龙找到安全的故事营地'; ClassroomStory = '整理研究站的观察档案' },
  @{ Key = 'space'; Name = 'Space'; Home = 'H03'; Classroom = 'C03'; HomeStory = '找回小机器人探测器的信号'; ClassroomStory = '分组恢复纸上通信站' },
  @{ Key = 'forest'; Name = 'Forest'; Home = 'H04'; Classroom = 'C04'; HomeStory = '帮森林邮差找到包裹收件人'; ClassroomStory = '用证据纠正邮局错分包裹' },
  @{ Key = 'halloween'; Name = 'Halloween / Autumn'; Home = 'H05'; Classroom = 'C05'; HomeStory = '找回四枚纸质南瓜灯印记'; ClassroomStory = '合作准备中性秋日纸上庆典' },
  @{ Key = 'christmas'; Name = 'Christmas / Winter'; Home = 'H06'; Classroom = 'C06'; HomeStory = '完成最后一份纸质礼物投递'; ClassroomStory = '分组完成冬日礼物分拣' }
)

foreach ($theme in $themes) {
  $pilotDir = Join-Path $pdfRoot "pilot-$($theme.Key)-v0.1"
  $pilotDir = [IO.Path]::GetFullPath($pilotDir)
  if (-not $pilotDir.StartsWith($pdfRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Pilot path is outside output/pdf: $pilotDir"
  }
  New-Item -ItemType Directory -Path $pilotDir -Force | Out-Null

  $pdfs = @(Get-ChildItem -LiteralPath $pdfRoot -Filter "$($theme.Key)-*.pdf" -File | Sort-Object Name)
  if ($pdfs.Count -ne 8) { throw "Expected 8 PDFs for $($theme.Key), found $($pdfs.Count)" }
  foreach ($pdf in $pdfs) { Copy-Item -LiteralPath $pdf.FullName -Destination $pilotDir -Force }

  Copy-Item -LiteralPath (Join-Path $blueprintRoot "$($theme.Key).md") -Destination (Join-Path $pilotDir '设计蓝图.md') -Force
  $recordPath = Join-Path $pilotDir '试玩与打印记录表.md'
  $record = $recordTemplate.Replace('{{THEME}}', $theme.Name).Replace('{{HOME}}', $theme.Home).Replace('{{CLASSROOM}}', $theme.Classroom)
  Set-Content -LiteralPath $recordPath -Value $record -Encoding UTF8

  $readmePath = Join-Path $pilotDir 'README.md'
  $readme = @"
# $($theme.Name) 试玩包 v0.1（内部草稿）

**仅供内部家庭与课堂试玩，不得销售、公开下载或转发。** Home $($theme.Home)：$($theme.HomeStory)。Classroom $($theme.Classroom)：$($theme.ClassroomStory)。两版是不同故事，玩家不能看到成人指南。

## 选择同场景、同纸张的两份文件

| 场景 | A4 | US Letter |
| --- | --- | --- |
| Home $($theme.Home) | ``$($theme.Key)-$($theme.Home)-player-v0.1-A4.pdf`` + ``$($theme.Key)-$($theme.Home)-host-v0.1-A4.pdf`` | ``$($theme.Key)-$($theme.Home)-player-v0.1-Letter.pdf`` + ``$($theme.Key)-$($theme.Home)-host-v0.1-Letter.pdf`` |
| Classroom $($theme.Classroom) | ``$($theme.Key)-$($theme.Classroom)-player-v0.1-A4.pdf`` + ``$($theme.Key)-$($theme.Classroom)-teacher-v0.1-A4.pdf`` | ``$($theme.Key)-$($theme.Classroom)-player-v0.1-Letter.pdf`` + ``$($theme.Key)-$($theme.Classroom)-teacher-v0.1-Letter.pdf`` |

1. 先读 ``设计蓝图.md`` 和成人指南，再按指南发玩家页；不要口头补充纸面没有的关键线索。
2. 成人/教师可沿边框裁开第二关路线/配对条、第三关的三张角色卡，以及除庆祝课堂外各版本第五关的候选卡；也可不裁开、直接排序或遮盖逐张揭示。庆祝和太空第二关有空白路线拼接板，恐龙课堂第四关另有可裁开的时间条；庆祝课堂第五关提供可填写的纸质徽章模板，万圣节家庭第五关有四枚可填写的纸质印记。剪刀只由成人/教师使用，解题本身不要求剪刀。
3. A4 与 Letter 各实际打印一套灰度和一套彩色，检查裁边、字号、对比、写字空间、纸卡完整性和文字/形状双编码。
4. 按 ``试玩与打印记录表.md`` 记录每关用时、唯一答案、上关成果、三级提示、跳关与参与情况；不收集孩子姓名、照片或录音。
5. 发现歧义或打印问题就记为待修订。自动校验通过不等于真人试玩通过，也不自动允许发布。

``SHA256SUMS.txt`` 是这八份 PDF 的校验值，反馈时注明文件名和问题页码。
"@
  Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8

  $hashLines = foreach ($pdf in $pdfs) {
    $hash = (Get-FileHash -LiteralPath $pdf.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $($pdf.Name)"
  }
  Set-Content -LiteralPath (Join-Path $pilotDir 'SHA256SUMS.txt') -Value $hashLines -Encoding UTF8

  $entries = @($pdfs | ForEach-Object { Join-Path $pilotDir $_.Name }) + @(
    $readmePath,
    $recordPath,
    (Join-Path $pilotDir '设计蓝图.md'),
    (Join-Path $pilotDir 'SHA256SUMS.txt')
  )
  $zipPath = Join-Path $pdfRoot "pilot-$($theme.Key)-v0.1.zip"
  Compress-Archive -LiteralPath $entries -DestinationPath $zipPath -Force
  $zip = Get-Item -LiteralPath $zipPath
  Write-Output "$($theme.Key): $($pdfs.Count) PDFs, $($zip.Length) bytes, $($zip.FullName)"
}
