const actionIds = [
  "placeAction",
  "boatAction",
  "cableAction",
  "benchAction",
  "benchStand",
  "festivalAction",
  "villageAction",
  "funfairAction",
  "funfairExit",
  "castleAction",
];
const countIds = [
  "gardenCounts",
  "riverCounts",
  "lagoonCounts",
  "villageCounts",
  "funfairCounts",
  "castleCounts",
  "placeCounts",
];

export function createHud({ $, getPlace, getHud, canInteract = () => true }) {
  let idleDelay = 0;
  const buttons = new Map();
  function button(id) {
    if (buttons.has(id)) return buttons.get(id);
    let element = $(`#${id}`);
    if (!element) {
      element = document.createElement("button");
      element.id = id;
      element.type = "button";
      element.hidden = true;
      $("#benchControls").appendChild(element);
    }
    element.onclick = () => {
      const action = (getHud().actions ?? []).find(
        (entry) => (entry.id ?? "placeAction") === id,
      );
      if (
        canInteract() &&
        action &&
        !action.disabled &&
        action.visible !== false
      )
        action.run?.();
    };
    buttons.set(id, element);
    return element;
  }
  actionIds.forEach(button);
  return function updateHud({ isMoving, paused, dt }) {
    idleDelay = paused ? 0 : isMoving ? 0.9 : Math.max(0, idleDelay - dt);
    document.body.classList.toggle("is-moving", idleDelay > 0);
    const model = getHud();
    for (const element of buttons.values()) element.hidden = true;
    for (const action of model.actions ?? []) {
      const element = button(action.id ?? "placeAction");
      element.hidden = paused || action.visible === false;
      element.disabled = Boolean(action.disabled);
      element.textContent = action.label ?? "Interact · X";
    }
    $("#throw").hidden = !getPlace().canThrow;
    for (const id of countIds) $(`#${id}`).hidden = id !== model.countsId;
    if (model.progress !== undefined) {
      $("#placeCounts").textContent = model.progress;
      $("#placeCounts").hidden = false;
    }
    if (model.quest) {
      if (model.quest.eyebrow !== undefined)
        $(".quest .eyebrow").textContent = model.quest.eyebrow;
      if (model.quest.title !== undefined)
        $(".quest h1").innerHTML = model.quest.title;
      if (model.quest.objective !== undefined)
        $("#objective").textContent = model.quest.objective;
    }
    if (model.instructions !== undefined)
      $(".instructions").innerHTML = model.instructions;
    if (model.hint !== undefined) $("#caveHint").textContent = model.hint;
    const region = model.region ?? getPlace().name ?? getPlace().id;
    if ($("#region").firstChild.textContent !== region)
      $("#region").firstChild.textContent = region;
    $("#stick").hidden = Boolean(model.hideStick);
    $("#ringMeter").hidden = paused || !model.meter;
    if (model.meter) {
      $("#ringNeedle").style.left = `${(model.meter.aim + 1) * 50}%`;
      $("#ringTarget").style.left = `${(model.meter.target + 1) * 50}%`;
      $("#ringMeter").setAttribute(
        "aria-valuenow",
        String(Math.round((model.meter.aim + 1) * 50)),
      );
    }
  };
}
