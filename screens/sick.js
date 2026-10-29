// S6: the sick list. After 30 days the app asks once whether to keep praying.
import { daysBetween, newId } from '../core/dates.js';
import { genderOf, sickName } from '../core/prayers.js';
                                                     
                                     
import { appBar, bottomNav, h } from '../ui.js';

const ASK_AFTER_DAYS = 30;

export function renderSick(ctx     )              {
  const state = ctx.store.get();
  const setSick = (sick             , label         ) => ctx.store.set({ ...ctx.store.get(), sick }, label);
  const recovered = (s           ) => setSick(ctx.store.get().sick.filter((x) => x.id !== s.id), `${s.text} הוסר מהרשימה`);

  // His name, בן / בת (which also picks the man's or the woman's wording), his mother's name.
  let gender            = 'm';
  const input = h('input', { placeholder: 'רפאל', 'aria-label': 'שם החולה', enterkeyhint: 'next' })                    ;
  const mother = h('input', { placeholder: 'שרה', 'aria-label': 'שם האם' })                    ;
  const preview = h('p', { class: 'note' });
  const seg = h('div', { class: 'seg' });
  const draw = () => {
    seg.replaceChildren(
      h('button', { type: 'button', class: gender === 'm' ? 'on' : '', onclick: () => { gender = 'm'; draw(); } }, 'בן (גבר)'),
      h('button', { type: 'button', class: gender === 'f' ? 'on' : '', onclick: () => { gender = 'f'; draw(); } }, 'בת (אישה)'));
    const t = sickName(input.value, mother.value, gender);
    preview.textContent = t ? 'יירשם: ' + t : '';
  };
  input.addEventListener('input', draw);
  mother.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); mother.focus(); } });
  draw();
  const add = (e       ) => {
    e.preventDefault();
    if (!input.value.trim()) return input.focus();
    if (!mother.value.trim()) return mother.focus();
    const text = sickName(input.value, mother.value, gender);
    mother.blur(); input.blur();
    setSick([...ctx.store.get().sick, { id: newId(), text, gender, addedOn: ctx.today, askedOn: null }]);
  };

  const ask = state.sick.filter((s) => !s.askedOn && daysBetween(s.addedOn, ctx.today) >= ASK_AFTER_DAYS);
  return h('div', { class: 'screen' },
    appBar('חולים', `${state.sick.length} ברשימה`),
    h('main', { class: 'body' },
      ...ask.map((s) => h('div', { class: 'card' },
        h('p', {}, `${s.text} ברשימה ${daysBetween(s.addedOn, ctx.today)} יום. להמשיך להתפלל?`),
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn tonal', onclick: () => recovered(s) }, 'הבריא'),
          h('button', { class: 'btn fill', onclick: () => setSick(ctx.store.get().sick.map((x) => (x.id === s.id ? { ...x, askedOn: ctx.today } : x))) }, 'להמשיך')))),
      state.sick.length ? h('a', { class: 'btn fill wide', style: 'flex:none', href: '#prayer/sick' }, 'מי שברך לחולים') : null,
      ...state.sick.map((s) => h('div', { class: 'list-item' },
        h('div', { class: 'who' }, h('b', {}, s.text),
          h('small', {}, (genderOf(s) === 'f' ? 'נוסח לאישה' : 'נוסח לגבר') + ' · נוסף לפני ' + daysBetween(s.addedOn, ctx.today) + ' יום')),
        h('button', { class: 'btn tonal', onclick: () => recovered(s) }, 'הבריא'))),
      h('div', { class: 'sechead' }, 'הוספה'),
      h('form', { style: 'display:grid;gap:12px', onsubmit: add },
        h('div', { class: 'field' }, h('label', {}, 'שם החולה'), input), seg,
        h('div', { class: 'field' }, h('label', {}, 'שם האם'), mother), preview,
        h('button', { class: 'btn tonal wide', type: 'submit' }, 'הוסף לרשימה'))),
    bottomNav('sick'));
}
