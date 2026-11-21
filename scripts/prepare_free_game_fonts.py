"""Optional font rebuild helper; normal PDF generation uses committed font files.

Usage: python scripts/prepare_free_game_fonts.py --source /path/NotoSansSC-VF.ttf
Requires fonttools 4.61.1. The source must be the upstream OFL-licensed Noto Sans SC.
Do not use or distribute proprietary system fonts as replacements.
"""
import argparse
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--setting',choices=['home','classroom'],default='home');args=parser.parse_args()
 face=TTFont(args.source)
 license_text=' '.join(n.toUnicode() for n in face['name'].names if n.nameID==13)
 if 'SIL Open Font License' not in license_text:raise ValueError('Expected the OFL-licensed Noto Sans SC source')
 sources=['scripts/free_game_zh_content.py','scripts/generate_chinese_free_games.py','content/free-games/zh-game-contract.json']
 if args.setting=='home':sources+=['scripts/home_zh_v2.py','scripts/home_zh_layout.py','shared/free-games/zh-home-edition.json']
 if args.setting=='classroom':sources+=['scripts/classroom_zh_v2.py','scripts/classroom_zh_layout.py','shared/free-games/zh-classroom-edition.json']
 text=''.join((ROOT/p).read_text(encoding='utf-8') for p in sources)+''.join(chr(c) for c in range(32,127))
 sub=subset.Subsetter(options=subset.Options(retain_gids=True));sub.populate(text=text);sub.subset(face)
 for weight,style in [(400,'Regular'),(700,'Bold')]:
  font=instantiateVariableFont(face,{'wght':weight},inplace=False)
  family='PA Classroom Sans' if args.setting=='classroom' else 'PA Home Sans'
  prefix='PAClassroomSans' if args.setting=='classroom' else 'PAHomeSans'
  for nid,val in [(1,family),(2,style),(4,family+' '+style),(6,prefix+'-'+style),(16,family),(17,style)]:font['name'].setName(val,nid,3,1,0x409)
  path=ROOT/f'assets/fonts/{prefix}-{style}.ttf';font.save(path);print(path)

if __name__=='__main__':main()
