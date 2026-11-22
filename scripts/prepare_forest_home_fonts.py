"""Separate OFL Chinese subset; other published game fonts stay untouched."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
font=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf')
assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in font['name'].names if n.nameID==13)
wording=''.join((R/p).read_text(encoding='utf-8') for p in ['scripts/forest_home_zh_content.py','scripts/forest_home_zh_layout.py','scripts/generate_forest_home_zh.py'])+''.join(chr(i) for i in range(32,127))
s=subset.Subsetter(options=subset.Options(retain_gids=True));s.populate(text=wording);s.subset(font)
for weight,style in [(400,'Regular'),(700,'Bold')]:
 f=instantiateVariableFont(font,{'wght':weight},inplace=False)
 for nid,value in [(1,'PA Forest Sans'),(2,style),(4,'PA Forest Sans '+style),(6,'PAForestSans-'+style),(16,'PA Forest Sans'),(17,style)]:f['name'].setName(value,nid,3,1,0x409)
 f.save(R/f'assets/fonts/PAForestSans-{style}.ttf')
(R/'assets/fonts/PAForestSans-SOURCE.txt').write_text("Derived from Noto Sans SC variable font, SIL Open Font License 1.1. Source: C:/Windows/Fonts/NotoSansSC-VF.ttf. Separate Forest Home subset and renamed family; existing game fonts unchanged. Original copyright and license metadata retained in each subset font's embedded name table.\n",encoding='utf-8')
print('Prepared independent Forest Chinese fonts.')
