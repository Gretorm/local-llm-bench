// Inventory data model: 9 hotbar + 27 main slots.

class Inventory {
  constructor() {
    this.hotbar = new Array(9).fill(null);
    this.main = new Array(27).fill(null);
    this.selected = 0;
    this.cursor = null; // item held in hand when clicking UI
  }

  has(id, count = 1) {
    return this.count(id) >= count;
  }

  count(id) {
    let c = 0;
    for (const s of this.hotbar) if (s && s.id === id) c += s.count;
    for (const s of this.main) if (s && s.id === id) c += s.count;
    return c;
  }

  addItem(id, count) {
    // hotbar first
    for (let i = 0; i < 9; i++) {
      const s = this.hotbar[i];
      if (s && s.id === id && s.count < this.stackSize(id)) {
        const add = Math.min(count, this.stackSize(id) - s.count);
        s.count += add;
        count -= add;
        if (count <= 0) return true;
      }
    }
    for (let i = 0; i < 27; i++) {
      const s = this.main[i];
      if (s && s.id === id && s.count < this.stackSize(id)) {
        const add = Math.min(count, this.stackSize(id) - s.count);
        s.count += add;
        count -= add;
        if (count <= 0) return true;
      }
    }
    for (let i = 0; i < 27; i++) {
      if (!this.main[i]) {
        this.main[i] = { id, count: Math.min(count, this.stackSize(id)) };
        count -= this.main[i].count;
        if (count <= 0) return true;
      }
    }
    return false;
  }

  stackSize(id) {
    const it = ITEMS[id];
    return it ? it.stack : 1;
  }

  remove(id, count) {
    for (let i = 0; i < 9; i++) {
      const s = this.hotbar[i];
      if (s && s.id === id) {
        const take = Math.min(count, s.count);
        s.count -= take;
        count -= take;
        if (s.count <= 0) this.hotbar[i] = null;
        if (count <= 0) return true;
      }
    }
    for (let i = 0; i < 27; i++) {
      const s = this.main[i];
      if (s && s.id === id) {
        const take = Math.min(count, s.count);
        s.count -= take;
        count -= take;
        if (s.count <= 0) this.main[i] = null;
        if (count <= 0) return true;
      }
    }
    return false;
  }

  getSelected() {
    return this.hotbar[this.selected];
  }
}
