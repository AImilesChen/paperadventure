from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
font=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf')
assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in font['name'].names if n.nameID==13)
wording=''.join((R/p).read_text(encoding='utf-8') for p in ['scripts/museum_edition_content.py','scripts/museum_edition_layout.py','scripts/generate_museum_editions.py','shared/museum-edition.json'])+''.join(chr(i) for i in range(32,127))
s=subset.Subsetter(options=subset.Options(retain_gids=True));s.populate(text=wording);s.subset(font)
for weight,style in [(400,'Regular'),(700,'Bold')]:
 f=instantiateVariableFont(font,{'wght':weight},inplace=False)
 for nid,value in [(1,'PA Museum Sans'),(2,style),(4,'PA Museum Sans '+style),(6,'PAMuseumSans-'+style),(16,'PA Museum Sans'),(17,style)]:f['name'].setName(value,nid,3,1,0x409)
 f.save(R/f'assets/fonts/PAMuseumSans-{style}.ttf')
