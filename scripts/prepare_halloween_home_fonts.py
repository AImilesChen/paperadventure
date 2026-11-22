"""Independent OFL Chinese subset. Reviewed English and other fonts are immutable."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]
font=TTFont('C:/Windows/Fonts/NotoSansSC-VF.ttf')
assert 'SIL Open Font License' in ' '.join(n.toUnicode() for n in font['name'].names if n.nameID==13)
wording=''.join((R/p).read_text(encoding='utf-8') for p in ['scripts/halloween_home_zh_content.py','scripts/halloween_home_zh_layout.py','scripts/generate_halloween_home_zh.py'])+''.join(chr(i) for i in range(32,127))
sub=subset.Subsetter(options=subset.Options(retain_gids=True));sub.populate(text=wording);sub.subset(font)
for weight,style in [(400,'Regular'),(700,'Bold')]:
    f=instantiateVariableFont(font,{'wght':weight},inplace=False)
    for nid,value in [(1,'PA Halloween Sans'),(2,style),(4,'PA Halloween Sans '+style),(6,'PAHalloweenSans-'+style),(16,'PA Halloween Sans'),(17,style)]:f['name'].setName(value,nid,3,1,0x409)
    f.save(R/f'assets/fonts/PAHalloweenSans-{style}.ttf')
(R/'assets/fonts/PAHalloweenSans-SOURCE.txt').write_text('Derived from Noto Sans SC, SIL Open Font License1.1. Source: C:/Windows/Fonts/NotoSansSC-VF.ttf. Independent renamed Halloween Home Chinese subset. Original copyright/license metadata retained in font name tables. Existing fonts unchanged.\n',encoding='utf-8')
print('Prepared independent Halloween Chinese TrueType fonts.')
