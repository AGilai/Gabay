// S6: the sick list. After 30 days the app asks once whether to keep praying.
import { daysBetween, newId } from '../../core/dates.ts';
import type { SickEntry } from '../../core/types.ts';
import type { Ctx } from '../ctx.ts';
import { appBar, bottomNav, h } from '../ui.ts';

const ASK_AFTER_DAYS = 30;

export function renderSick(ctx: Ctx): HTMLElement {
  const state = ctx.store.get();
  const setSick = (sick: SickEntry[], label?: string) => ctx.store.set({ ...ctx.store.get(), sick }, label);
  const recovered = (s: SickEntry) => setSick(ctx.store.get().sick.filter((x) => x.id !== s.id), `${s.text} הוסר מהרשימה`);

  let text = '', gender: 'm' | 'f' = 'm';
  const input = h('input', { placeholder: 'רפאל בן שרה', 'aria-label': 'שם החולה', oninput: (e: Event) => { text = (e.target as HTMLInputElement).value.trim(); } }) as HTMLInputElement;
  const seg = h('div', { class: 'seg' });
  const drawSeg = () => seg.replaceChildren(
    h('button', { type: 'button', class: gender === 'm' ? 'on' : '', onclick: () => { gender = 'm'; drawSeg(); } }, 'זכר'),
    h('button', { type: 'button', class: gender === 'f' ? 'on' : '', onclick: () => { gender = 'f'; drawSeg(); } }, 'נקבה'));
  drawSeg();
  const add = (e: Event) => {
    e.preventDefault();
    if (!text) return input.focus();
    input.blur();
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
      state.sick.length ? h('a', { class: 'btn fill wide', href: '#prayer/sick' }, 'מי שברך לחולים') : null,
      ...state.sick.map((s) => h('div', { class: 'list-item' },
        h('div', { class: 'who' }, h('b', {}, s.text),
          h('small', {}, (s.gender === 'f' ? 'נקבה' : 'זכר') + ' · נוסף לפני ' + daysBetween(s.addedOn, ctx.today) + ' יום')),
        h('button', { class: 'btn tonal', onclick: () => recovered(s) }, 'הבריא'))),
      h('div', { class: 'sechead' }, 'הוספה'),
      h('form', { style: 'display:grid;gap:12px', onsubmit: add },
        h('div', { class: 'field' }, h('label', {}, 'שם ושם האם'), input), seg,
        h('button', { class: 'btn tonal wide', type: 'submit' }, 'הוסף לרשימה'))),
    bottomNav('sick'));
}
