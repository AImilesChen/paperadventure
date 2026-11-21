"""Rebuild independent OFL font files from the locally installed Noto Sans SC."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
def main():
 face=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf');assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in face['name'].names if n.nameID==13)
 wording=''.join((R/p).read_text(encoding='utf-8') for p in ['scripts/ocean_zh_content.py','scripts/ocean_zh_layout.py','scripts/generate_ocean_chinese.py','shared/ocean-zh-edition.json'])+''.join(chr(c) for c in range(32,127))
 sub=subset.Subsetter(options=subset.Options(retain_gids=True));sub.populate(text=wording);sub.subset(face)
 for weight,style in [(400,'Regular'),(700,'Bold')]:
  font=instantiateVariableFont(face,{'wght':weight},inplace=False)
  for nid,value in [(1,'PA Ocean Sans'),(2,style),(4,'PA Ocean Sans '+style),(6,'PAOceanSans-'+style),(16,'PA Ocean Sans'),(17,style)]:font['name'].setName(value,nid,3,1,0x409)
  font.save(R/f'assets/fonts/PAOceanSans-{style}.ttf')
if __name__=='__main__':main()
