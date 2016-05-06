jest.unmock('../lib/Backdulake'); // unmock to use the actual implementation of sum

const Backdulake = require('../lib/Backdulake');

var store= new Backdulake();

store.emitChange=jest.fn();

describe('handleReset', () => {
  it('resets everything', () => {


    expect(Array.isArray(store.collection)).toBe(true);
    expect(store.idAttribute).toBe("id");
    expect(store[store.idAttribute]).toBeFalsy();
    expect(store.model).toBeFalsy();
    expect(store.loading).toBe(false);
    expect(store.errors).toBeFalsy();
  });
});


describe('handleCreate', () => {
  it('resets everything', () => {
    store.handleCreate();

    expect(store[store.idAttribute]).toBeFalsy();
    expect(store.model).toBe(store.defaultModel);
    expect(store.loading).toBe(false);
  });
});


describe('handleSave', () => {
  it('saves the passed model', () => {
    let model={ name: "Jaime"};
    store.handleSave(model);

    expect(store[store.idAttribute]).toBeFalsy();
    expect(store.model).toBe(model);
    expect(store.loading).toBe(true);
  });

  it('saves the passed model and sets store.id', () => {
    let model={ name: "Jaime", id: 1};
    store.handleSave(model);

    expect(store[store.idAttribute]).toBe(model.id);
    expect(store.model).toBe(model);
    expect(store.loading).toBe(true);
  });
});
