"""Separate OFL Chinese subset; existing English and other game fonts are immutable."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
font=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf')
assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in font['name'].names if n.nameID==13)
sources=['scripts/space_home_zh_content.py','scripts/space_home_zh_layout.py','scripts/space_home_edition_layout.py','scripts/generate_space_home_editions.py','shared/space-home-edition.json']
wording=''.join((R/p).read_text(encoding='utf-8') for p in sources)+''.join(chr(i) for i in range(32,127))
s=subset.Subsetter(options=subset.Options(retain_gids=True));s.populate(text=wording);s.subset(font)
for weight,style in [(400,'Regular'),(700,'Bold')]:
 f=instantiateVariableFont(font,{'wght':weight},inplace=False)
 for nid,value in [(1,'PA Space Sans'),(2,style),(4,'PA Space Sans '+style),(6,'PASpaceSans-'+style),(16,'PA Space Sans'),(17,style)]:f['name'].setName(value,nid,3,1,0x409)
 f.save(R/f'assets/fonts/PASpaceSans-{style}.ttf')
print('Prepared separate OFL Space Chinese fonts.')
