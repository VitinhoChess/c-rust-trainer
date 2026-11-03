"""Compile every standalone example; execute only defined output/panic examples.
Analysis examples (undefined behavior, contract violations, terminate) are never run.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import sys
import tempfile
import time

root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/atelier-question-banks')
questions=[q for path in sorted(root.glob('*.json')) for q in json.loads(path.read_text())]

def validate(q):
    lang=q['language'];mode=q['verification']['kind']
    with tempfile.TemporaryDirectory(prefix='atelier-proof-') as work:
        folder=pathlib.Path(work);source=folder/('example.'+{'c':'c','cpp':'cpp','rust':'rs'}[lang]);source.write_text(q['code']);target=folder/'program'
        compiler={'c':['gcc','-std=c17','-pedantic-errors'],'cpp':['g++','-std=c++17','-pedantic-errors'],'rust':['rustc','--edition=2021','--crate-name','exercise','--cap-lints','allow']}[lang]
        result=subprocess.run(compiler+[str(source),'-o',str(target)],capture_output=True,text=True,timeout=30)
        if mode=='compile_fail':
            if result.returncode==0:return q['id']+': compilation unexpectedly succeeds'
        elif result.returncode!=0:return q['id']+': '+result.stderr[-1800:]
        elif mode in ('output','panic'):
            result=subprocess.run([str(target)],cwd=work,capture_output=True,text=True,timeout=3)
            if mode=='panic':
                if result.returncode==0:return q['id']+': expected panic'
            elif result.returncode!=0 or result.stdout!=q['verification']['expected_stdout']:
                return q['id']+': expected '+repr(q['verification']['expected_stdout'])+', got '+repr(result.stdout)+' / '+str(result.returncode)
    return None

failures=[];start=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    jobs={pool.submit(validate,q):q for q in questions}
    for index,future in enumerate(concurrent.futures.as_completed(jobs),1):
        try: error=future.result()
        except Exception as exc:error=jobs[future]['id']+': '+repr(exc)
        if error:failures.append(error);print('FAIL',error,flush=True)
        if index%100==0:print(f'{index}/{len(questions)} checked ({time.monotonic()-start:.0f}s)',flush=True)
print(json.dumps({'checked':len(questions),'failures':len(failures)},indent=2))
raise SystemExit(bool(failures))
