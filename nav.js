// Navigation that mirrors the phone's history, so the in-app back arrow and Android's back gesture agree.
// The app keeps its own copy of the history entries it made; going "back" or "home" moves back through
// the real history instead of adding entries, which is what used to make back loop between two screens.

                          
                                            
                           
                          
                              
 

const MAIN = '#reading';
const norm = (h        ) => (h === '' || h === '#' ? MAIN : h);

export class Nav {
          browser         ;
          stack          ;
          replacing = false;
          goingTo                = null; // stack length expected after a multi-step back

  constructor(browser         ) {
    this.browser = browser;
    this.stack = [norm(browser.current())];
  }

  depth()         {
    return this.stack.length;
  }

  // Call on every hashchange (in-app or the system back / forward).
  changed()       {
    const cur = norm(this.browser.current());
    if (this.replacing) { this.replacing = false; this.stack[this.stack.length - 1] = cur; return; }
    if (this.goingTo !== null) { this.stack.length = this.goingTo; this.goingTo = null; return; }
    if (this.stack.length > 1 && this.stack[this.stack.length - 2] === cur) this.stack.pop();
    else if (this.stack[this.stack.length - 1] !== cur) this.stack.push(cur);
  }

  go(hash        )       {
    const h = norm(hash);
    if (h === this.stack[this.stack.length - 1]) return;
    if (h === this.stack[this.stack.length - 2]) return this.back(); // going to where we came from is "back"
    this.browser.push(hash);
  }

  replace(hash        )       {
    this.replacing = true;
    this.browser.replace(hash);
  }

  back()       {
    if (this.stack.length > 1) this.browser.go(-1);
    else this.replace(MAIN);
  }

  // Return to a screen opened earlier (the main page after a pick), dropping what was opened after it.
  home(hash = MAIN)       {
    const h = norm(hash);
    const i = this.stack.lastIndexOf(h);
    const top = this.stack.length - 1;
    if (i === top) return;
    if (i < 0) return this.replace(hash);
    if (i === top - 1) return this.browser.go(-1);
    this.goingTo = i + 1;
    this.browser.go(i - top);
  }

  // A bottom-bar tab: back to it if it is open below, else open it.
  tab(hash        )       {
    if (this.stack.includes(norm(hash))) this.home(hash);
    else this.go(hash);
  }
}

let real             = null;

export function nav()      {
  real ??= new Nav({
    current: () => location.hash,
    push: (h) => { location.hash = h; },
    go: (n) => history.go(n),
    replace: (h) => location.replace(location.pathname + location.search + h),
  });
  return real;
}
