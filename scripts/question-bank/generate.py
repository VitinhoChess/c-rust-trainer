"""Build three deterministic question banks from the authored scenario catalog.
Run with --write to replace active banks (previous files are archived first).
Without --write, write the candidate banks below /tmp for independent validation.
"""
import collections
import importlib.util
import json
import pathlib
import random
import shutil
import sys
from common import CATALOG

ROOT = pathlib.Path(__file__).resolve().parents[2]
C_HEADERS = '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stddef.h>\n#include <stdint.h>\n#include <limits.h>\n#include <ctype.h>\n'
CPP_HEADERS = '\n'.join('#include <'+h+'>' for h in ['iostream','string','string_view','vector','array','map','unordered_map','memory','algorithm','utility','optional','type_traits','initializer_list','atomic','mutex','stdexcept','iterator'])+'\n'

def alternatives(answer, supplied):
    if supplied:
        result = [str(x) for x in supplied if str(x) != answer]
    else:
        try:
            value = int(answer)
            result = [str(value+1), str(value-1), str(value+2)]
        except ValueError:
            result = ['Erreur de compilation', 'Panic à l’exécution', 'Aucune sortie']
    result = list(dict.fromkeys(x for x in result if x != answer))
    for text in ['Aucune sortie', 'Le résultat dépend nécessairement du hasard', 'Erreur de compilation', 'La sortie est une chaîne vide']:
        if len(result) == 3:
            break
        if text != answer and text not in result:
            result.append(text)
    assert len(result) == 3
    return result

def choice(prompt, pairs, explanation, rng, multiple=False):
    rng.shuffle(pairs)
    correct = [i for i, (_, right) in enumerate(pairs) if right]
    data = dict(prompt=prompt, type='multiple_choice' if multiple else 'single_choice', options=[text for text, _ in pairs], explanation=explanation, last_seen_at=None)
    if multiple:
        data['correct_answers'] = correct
    else:
        assert len(correct) == 1
        data['correct_answer'] = correct[0]
        data['correct_option'] = data['options'][correct[0]]
    return data

summary = {}
for language in ['c', 'cpp', 'rust']:
    CATALOG.clear()
    spec = importlib.util.spec_from_file_location('catalog_'+language, pathlib.Path(__file__).with_name(language+'.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert collections.Counter(level for level, *_ in CATALOG) == {1:20,2:20,3:20}, (language, collections.Counter(level for level, *_ in CATALOG))
    bank = []
    for family_index, (level, topic, family, factory) in enumerate(CATALOG):
        for variant in range(1,6):
            rng = random.Random(f'atelier-2026-{language}-{family}-{variant}')
            source = factory(variant)
            assert len(source['truths']) >= 3 and len(source['falsehoods']) >= 3, (family, source)
            assert all(source['truths']+source['falsehoods']), (family,source['truths'],source['falsehoods'])
            if language == 'c':
                headers = '#include <stdio.h>\n'
                text=source['code']+source['preamble']
                for header,tokens in [('stdlib.h',['malloc','calloc','realloc','free','qsort','strtol']),('string.h',['memcpy','memmove','memset','memcmp','strlen','strcmp']),('stdint.h',['SIZE_MAX','uint']),('limits.h',['UINT_MAX']),('ctype.h',['isalpha'])]:
                    if any(token in text for token in tokens): headers+='#include <'+header+'>\n'
                code = headers+source['preamble']+'\nint main(void){\n'+source['code']+'\nreturn 0;\n}'
            elif language == 'cpp':
                headers='#include <iostream>\n'
                text=source['code']+source['preamble']
                for header,tokens in [('string',['std::string']),('string_view',['std::string_view']),('vector',['std::vector']),('array',['std::array']),('map',['std::map']),('unordered_map',['std::unordered_map']),('memory',['std::make_','std::unique_ptr','std::shared_ptr','std::weak_ptr']),('algorithm',['std::find','std::remove','std::sort']),('utility',['std::move','std::pair','std::forward']),('optional',['std::optional']),('type_traits',['std::is_']),('initializer_list',['std::initializer_list']),('atomic',['std::atomic','std::memory_order']),('mutex',['std::mutex','std::lock_guard']),('stdexcept',['std::out_of_range']),('iterator',['std::distance'])]:
                    if any(token in text for token in tokens): headers+='#include <'+header+'>\n'
                code = headers+source['preamble']+'\nint main(){\n'+source['code']+'\n}'
            else:
                code = source['preamble']+'\nfn main(){\n'+source['code']+'\n}'
            uid = f'{language.upper()}-2026-L{level}-{family_index%20+1:02d}-V{variant}'
            q1 = choice(source['prompt'], [(source['answer'], True)]+[(x, False) for x in alternatives(source['answer'], source['wrong'])], source['explanation'], rng)
            # Counts are balanced across families and variants, not fixed by language.
            k = 1+(family_index+variant)%3
            truths = rng.sample(source['truths'], k)
            falsehoods = rng.sample(source['falsehoods'], 4-k)
            q2 = choice('Quelles affirmations décrivent correctement le fonctionnement et les garanties de cet extrait ?', [(x, True) for x in truths]+[(x, False) for x in falsehoods], source['explanation']+' '+ ' '.join(source['truths'])+'.', rng, True)
            form = variant % 5
            base = dict(id=uid, language=language, topic=topic, subtopic=family, difficulty=level, standard={'c':'C17','cpp':'C++17','rust':'Rust 2021'}[language], code=code, explanation=source['explanation'], tags=[topic,family], variant_group=language+'_'+family, last_seen_at=None, seen_count=0, verification={'kind':source['mode'], 'expected_stdout':source['answer'] if source['mode']=='output' else None})
            if form == 2:
                base['type'] = 'multi_question'
                base['questions'] = [dict(q1,id=uid+'-Q1'), dict(q2,id=uid+'-Q2')]
            else:
                chosen = q1 if form in (0,3) else q2
                base.update(chosen)
                base['question'] = base.pop('prompt')
            bank.append(base)
    assert len(bank) == 300 and collections.Counter(q['difficulty'] for q in bank)=={1:100,2:100,3:100}
    output = ROOT/'database' if '--write' in sys.argv else pathlib.Path('/tmp/atelier-question-banks')
    output.mkdir(parents=True,exist_ok=True)
    if '--write' in sys.argv and not (ROOT/'database/archive/before-diversification').exists():
        archive=ROOT/'database/archive/before-diversification'; archive.mkdir(parents=True)
        for old in (ROOT/'database').glob('*.json'):
            shutil.copy2(old,archive/old.name)
    filename='questions_'+language+'.json'
    (output/filename).write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
    summary[language] = {'exercises':len(bank),'questions':sum(len(q.get('questions',[q])) for q in bank),'families':len(CATALOG)}
if '--write' in sys.argv:
    # Retain old editions in the archive, with exactly three active JSON files.
    for name in ['questions_c_v2.json','questions_rust_v2.json','questions_cpp_all.json']:
        old=ROOT/'database'/name
        if old.exists():
            old.rename(ROOT/'database/archive/before-diversification'/name)
print(json.dumps(summary,ensure_ascii=False,indent=2))
