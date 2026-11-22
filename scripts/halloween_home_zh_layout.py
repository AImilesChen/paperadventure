"""Chinese text/embedded fonts over the frozen English vector-prop geometry."""
import re
from html import unescape
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph,Table,TableStyle,Spacer
from reportlab.lib.styles import ParagraphStyle
import halloween_home_edition_content as en
import halloween_paper_theatre as old
from halloween_home_zh_content import COPY
COPY={re.sub(r'\s+',' ',k).strip():v for k,v in COPY.items()}

UNKNOWN=set()
def fragment(value):
    s=re.sub(r'\s+',' ',unescape(str(value))).strip()
    if not s:return ''
    if s in COPY:return COPY[s]
    if re.search(r'[\u3400-\u9fff]',s):return s
    if not re.search(r'[A-Za-z]',s):return s
    m=re.fullmatch(r'(\d+) / (BAT|OWL|PUMPKIN|STAR)',s)
    if m:return m[1]+'／'+COPY[m[2]]
    m=re.fullmatch(r'WINDOW (\d)',s)
    if m:return '窗'+m[1]
    m=re.fullmatch(r'PLAYER / MISSION (\d) / STORY AND ACTIONS',s)
    if m:return '玩家／第'+m[1]+'关／故事与操作'
    m=re.fullmatch(r'HOST / MISSION\s*(\d) / LEAD ACTIONS / PRIVATE',s)
    if m:return '成人／第'+m[1]+'关／引导操作／私用'
    m=re.fullmatch(r'Check mission (\d)',s)
    if m:return '第'+m[1]+'关／成人核验'
    m=re.fullmatch(r'(\d+) / SAY',s)
    if m:return '第'+m[1]+'句／朗读'
    m=re.fullmatch(r'SAY (\d+):',s)
    if m:return '第'+m[1]+'句／朗读：'
    m=re.match(r'^(\d+)\.\s*(.+)$',s)
    if m:return m[1]+'．'+fragment(m[2])
    m=re.fullmatch(r'Use Player\s*(\d+)\. Read its numbered actions with the team\. Keep all later pages private\. Children show the actual work rather than copy answers\.',s)
    if m:return '按玩家第'+m[1]+'页带领小队逐条操作。后续材料暂不展示，检查实际作品，不要求重复抄写。'
    UNKNOWN.add(s)
    return s

def markup(value):
    parts=re.split(r'(<[^>]+>)',str(value))
    return ''.join(x if x.startswith('<') else fragment(x) for x in parts)

BODY=ParagraphStyle('halloween-zh-player',fontName='PAHALLOWEENZH',fontSize=12.2,leading=18.2,wordWrap='CJK',textColor=old.INK,spaceAfter=9)
HOST=ParagraphStyle('halloween-zh-host',parent=BODY,fontSize=11.6,leading=17.6,spaceAfter=8)
LABEL=ParagraphStyle('halloween-zh-label',parent=BODY,fontName='PAHALLOWEENZH-Bold',fontSize=10.3,leading=15,textColor=old.CORAL,spaceAfter=8)
TITLE=ParagraphStyle('halloween-zh-title',parent=BODY,fontName='PAHALLOWEENZH-Bold',fontSize=23,leading=30,textColor=old.NAVY,spaceAfter=12)

def p(value,host=False):
    text=markup(value).replace('<b>','<font name="PAHALLOWEENZH-Bold">').replace('</b>','</font>')
    return Paragraph(text,HOST if host else BODY)
def header(title,tag):return [Paragraph(markup(tag),LABEL),Paragraph(markup(title),TITLE),Spacer(1,9)]
def note(message,width,host=False):
    t=Table([[p(message,host)]],colWidths=[width])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),old.PALE),('BOX',(0,0),(-1,-1),.8,old.LINE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    return t
def steps(items,host=False):return [p(f'<b>{n}.</b> {item}',host) for n,item in enumerate(items,1)]

class ChineseCanvas(Canvas):
    def setFont(self,psfontname,size,leading=None):
        mapped={'Arial':'PAHALLOWEENZH','ArialBold':'PAHALLOWEENZH-Bold','Georgia':'PAHALLOWEENZH-Bold'}.get(psfontname,psfontname)
        return super().setFont(mapped,size,leading)
    def drawString(self,x,y,text,*args,**kwargs):return super().drawString(x,y,fragment(text),*args,**kwargs)
    def drawCentredString(self,x,y,text,*args,**kwargs):return super().drawCentredString(x,y,fragment(text),*args,**kwargs)
    def drawRightString(self,x,y,text,*args,**kwargs):return super().drawRightString(x,y,fragment(text),*args,**kwargs)

def composition(source,width):
    # Only this isolated Chinese generation process patches helpers in memory.
    # The reviewed English files and source module are never rewritten/regenerated.
    previous={name:getattr(en,name) for name in ['p','header','note','steps']};oldp=old.p
    try:
        en.p=p;en.header=header;en.note=note;en.steps=steps;old.p=p
        return en.player(source,width),en.guide(source,width)
    finally:
        for k,v in previous.items():setattr(en,k,v)
        old.p=oldp
