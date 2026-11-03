"""Reviewed scenario factories; five bounded variants per concept, not hundreds."""
CATALOG = []

def add(level, topic, name, factory):
    CATALOG.append((level, topic, name, factory))

def case(code, answer, explanation, truths, falsehoods, *, wrong=None, preamble='', mode='output', prompt=None):
    return dict(code=code, answer=str(answer), explanation=explanation,
                truths=truths.split('|'), falsehoods=falsehoods.split('|'),
                wrong=wrong, preamble=preamble, mode=mode,
                prompt=prompt or ('Quel est le résultat de cet extrait ?' if mode=='output' else 'Quel diagnostic décrit précisément cet extrait ?'))
