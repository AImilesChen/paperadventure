"""Build a local draft dictionary from fixed source-owned UI copy only.

Never run on customer text, database rows, credentials or runtime responses.
The browser uses the resulting local JSON; it never calls this service.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed
import json, re, time, threading, sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent.parent
source=json.loads((root/'docs/i18n/translation-input.json').read_text(encoding='utf-8'))
target=root/'src/i18n/zh.json'
cache=json.loads(target.read_text(encoding='utf-8'))
pending=[s for s in source if s not in cache]
batches=[]; batch=[]; size=0
for item in pending:
    if size+len(item)+12>2800 and batch:
        batches.append(batch);batch=[];size=0
    batch.append(item);size+=len(item)+12
if batch:batches.append(batch)
lock=threading.Lock(); failures=[]
def request(text):
    url='https://translate.googleapis.com/translate_a/single?'+urlencode({'client':'gtx','sl':'en','tl':'zh-CN','dt':'t','q':text})
    for attempt in range(3):
        try:
            with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as response:
                data=json.loads(response.read())
            return ''.join(part[0] or '' for part in data[0])
        except Exception:
            if attempt==2:raise
            time.sleep(2*(attempt+1))
def run(values):
    text='\n'.join(f'[{i:06d}] '+s.replace('\n',' ') for i,s in enumerate(values))
    translated=request(text)
    marks=list(re.finditer(r'[\[【]\s*(\d{6})\s*[\]】]',translated))
    result={}
    for i,m in enumerate(marks):
        n=int(m.group(1))
        if n<len(values):
            value=translated[m.end():marks[i+1].start() if i+1<len(marks) else len(translated)].strip()
            if value:result[values[n]]=value
    # A malformed marker never attaches a translation to a different string.
    if len(result)!=len(values):
        for s in values:
            if s not in result:result[s]=request(s)
    with lock:
        cache.update(result)
        temp=target.with_suffix('.tmp');temp.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(target)
    return len(result)
print(json.dumps({'pending':len(pending),'batches':len(batches)}),flush=True)
with ThreadPoolExecutor(max_workers=3) as executor:
    jobs={executor.submit(run,b):i for i,b in enumerate(batches)}
    for completed,future in enumerate(as_completed(jobs),1):
        try:future.result()
        except Exception as e:failures.append({'batch':jobs[future],'error':type(e).__name__})
        if completed%10==0 or completed==len(jobs):print(json.dumps({'completedBatches':completed,'total':len(jobs),'entriesSaved':len(cache),'failed':len(failures)}),flush=True)
(root/'docs/i18n/translation-draft-status.json').write_text(json.dumps({'source':'Fixed UI source catalog; machine draft pending contextual review','entries':len(cache),'failures':failures},indent=2),encoding='utf-8')
