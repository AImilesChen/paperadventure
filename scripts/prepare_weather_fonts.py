from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
font=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf')
assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in font['name'].names if n.nameID==13)
wording=''.join((R/p).read_text(encoding='utf-8') for p in ['scripts/weather_edition_content.py','scripts/weather_edition_layout.py','scripts/generate_weather_editions.py','shared/weather-edition.json'])+''.join(chr(i) for i in range(32,127))
s=subset.Subsetter(options=subset.Options(retain_gids=True));s.populate(text=wording);s.subset(font)
for weight,style in [(400,'Regular'),(700,'Bold')]:
 f=instantiateVariableFont(font,{'wght':weight},inplace=False)
 for nid,value in [(1,'PA Weather Sans'),(2,style),(4,'PA Weather Sans '+style),(6,'PAWeatherSans-'+style),(16,'PA Weather Sans'),(17,style)]:f['name'].setName(value,nid,3,1,0x409)
 f.save(R/f'assets/fonts/PAWeatherSans-{style}.ttf')
