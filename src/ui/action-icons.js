const shapes = {
  sauna:
    '<path d="M4 15h16v6H4ZM7 15v-3m10 3v-3M7 9q-3-3 0-6m5 6q-3-3 0-6m5 6q-3-3 0-6M3 21h18" />',
  snowman:
    '<circle cx="12" cy="7" r="4" /><ellipse cx="12" cy="17" rx="7" ry="5" /><path d="M8 3h8M10 2V1h4v1M9 11h6m-3 0v4M5 15l-3-3m17 3 3-3M12 6l3 1-3 1" />',
  skate:
    '<path d="M8 3h8v9l4 2v4H5v-4l3-2ZM3 21h17l2-2M7 18v3m10-3v3M8 7h6m-6 3h6" />',
  interact:
    '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7ZM4 18v4m-2-2h4m14-5v4m-2-2h4" />',
  pool: '<circle cx="10" cy="9" r="6" /><path d="m14.5 13.5 6 6M6 9q2-2 4 0t4 0M3 19q2-2 4 0t4 0" />',
  castle:
    '<path d="M4 21V9h3V5h3v4h4V5h3v4h3v12ZM9 21v-5a3 3 0 0 1 6 0v5M12 5V2h5l-2 2h-3" />',
  collect:
    '<path d="M12 20C8 20 2 13 3 9a4 4 0 0 1 4-4 5 5 0 0 1 10 0 4 4 0 0 1 4 4c1 4-5 11-9 11ZM12 5v11M7 7l3 9m7-9-3 9M9 20h6" />',
  sunset:
    '<path d="M2 16h20M6 16a6 6 0 0 1 12 0M12 3v3M3 7l2 2m16-2-2 2M4 20h16" />',
  bench:
    '<path d="M4 5h16v8H4ZM3 13h18v4H3ZM5 17v4m14-4v4M7 5v8m10-8v8M4 9h16" />',
  boat: '<path d="m3 14 2 6h14l2-6-9-3ZM12 3v8M7 7h10v6M2 22q2-2 4 0t4 0t4 0t4 0t4 0" />',
  cable: '<path d="m2 5 20-3M12 4v5M5 10h14v11H5ZM5 16h14M12 10v6" />',
  ferris:
    '<circle cx="12" cy="10" r="8" /><circle cx="12" cy="10" r="2" /><path d="M12 2v6m0 4v6M4 10h6m4 0h6M6 4l4 4m4 4 4 4M18 4l-4 4m-4 4-4 4M9 17l-2 5m8-5 2 5M5 22h14" />',
  carousel:
    '<path d="m3 8 9-6 9 6ZM5 8v13m7-13v13m7-13v13M3 21h18M7 14h10l-2 4H9Z" />',
  ring: '<ellipse cx="11" cy="15" rx="8" ry="4" /><path d="M11 3v12M18 2l2 2m-1 4h3" />',
  sheep:
    '<path d="M8 8a4 4 0 0 1 8 0 4 4 0 0 1 3 7l-2 3H7l-2-3a4 4 0 0 1 3-7ZM8 18v4m8-4v4" /><ellipse cx="12" cy="13" rx="3" ry="4" /><path d="m9 11-3-1m9 1 3-1" />',
  cart: '<path d="M3 11h18l-3 7H6ZM7 11V5h10v6M5 22h14" /><circle cx="7" cy="20" r="1" /><circle cx="17" cy="20" r="1" />',
  shop: '<path d="M4 10v11h16V10M3 10l2-7h14l2 7q-2 3-4 0-2 3-5 0-3 3-5 0-2 3-4 0ZM9 21v-6h6v6M8 3l-1 7m9-7 1 7" />',
  bakery:
    '<path d="M4 18c-3-5 1-12 6-12l2-3 2 3c5 0 9 7 6 12l-4-1H8ZM8 7l2 10m6-10-2 10M2 20h20" />',
  outfit: '<path d="m8 3 4 3 4-3 6 5-4 4-2-2v11H8V10l-2 2-4-4Z" />',
  flowers:
    '<circle cx="12" cy="8" r="2" /><path d="M10 5q-3-6-5-2t3 5q-6 1-4 4t6-1q-1 6 3 5t1-6q6 2 6-2t-6-1q4-5 1-6t-5 4M12 16v6m0-2q-5 0-5-4m5 3q5 0 5-4" />',
  book: '<path d="M12 5q-4-3-10-2v15q6-1 10 2 4-3 10-2V3q-6-1-10 2ZM12 5v15M5 7h4m-4 4h4m6-4h4m-4 4h4" />',
  tea: '<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 10h2a3 3 0 0 1 0 6h-2M3 22h17M7 6q-2-2 0-4m5 4q-2-2 0-4" />',
  piano:
    '<rect x="2" y="6" width="20" height="15" rx="1" /><path d="M7 6v15m5-15v15m5-15v15M5 6v8h4V6m6 0v8h4V6" />',
  chest:
    '<path d="M3 11a9 9 0 0 1 18 0v10H3ZM3 11h18M7 5v16m10-16v16" /><rect x="10" y="10" width="4" height="5" rx="1" />',
  fireworks:
    '<path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3m-8 8-3 3m7-10 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5Z" />',
  rebuild: '<path d="M3 11a9 9 0 1 1 3 8M3 5v6h6M9 15v-4h6v4m-7 3h8" />',
  gate: '<path d="M4 21V9a8 8 0 0 1 16 0v12M4 9h16M9 21V9h6v12M1 21h22" />',
};

export function actionIcon(name = "interact") {
  const shape =
    name === "return"
      ? '<use href="#returnIcon" />'
      : (shapes[name] ?? shapes.interact);
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shape}</svg>`;
}
