// Small illustrated landmarks share a palette and silhouette on the journey map.
const sunflowerPetals = Array.from(
  { length: 12 },
  (_, index) =>
    `<ellipse cx="50" cy="25" rx="4.5" ry="10" transform="rotate(${index * 30} 50 39)"/>`,
).join("");

const landmarks = {
  garden: `<path fill="#6f986b" d="M18 72q32-24 64 0l-8 10H26Z"/><path d="M50 68V42m0 17-14-8m14 12 14-8" stroke="#b7cf8a"/><g fill="#f6c861">${sunflowerPetals}</g><circle cx="50" cy="39" r="8" fill="#795434"/><g fill="#f4dd9a"><circle cx="25" cy="69" r="3"/><circle cx="74" cy="70" r="3"/></g>`,
  cave: `<path fill="#789187" d="m17 75 8-36 19-18 23 9 16 45Z"/><path fill="#405952" d="m34 75 3-26 13-12 13 12 4 26Z"/><path fill="#f4c765" d="m49 53 8 9-8 12-8-12Z"/><path fill="#f7e3ac" d="m24 49 5-7 5 7-5 9Zm43-9 4-6 5 6-5 8Z"/>`,
  winter: `<path fill="#a8c9bd" d="M20 71h61v10H20Z"/><path fill="#dfa773" d="M32 43h38v31H32Z"/><path fill="#f7f0d6" d="m24 45 27-25 27 25Z"/><path fill="#7daba2" d="m10 62 11-22 11 22Zm58-2 12-27 12 27Z"/><path stroke="#edf5e5" d="M20 24V10m-7 7h14m-12-5 10 10m0-10-10 10"/><path fill="#f8d477" d="M39 51h9v10h-9Zm17 0h9v10h-9Z"/><path fill="#75594a" d="M48 63h9v11h-9Z"/>`,
  village: `<path fill="#8da88b" d="m13 68 23-35 24 35 17-24 15 26Z"/><path fill="#f6edd2" d="m25 49 11-16 11 16-11-4Z"/><path fill="#e9c49b" d="M29 55h42v25H29Z"/><path fill="#b57759" d="m22 57 28-21 28 21Z"/><path fill="#75594a" d="M46 64h9v16h-9Z"/><path fill="#f8dd94" d="M35 62h7v9h-7Zm25 0h7v9h-7Z"/>`,
  funfair: `<circle cx="50" cy="42" r="25" fill="#49736b" stroke="#f3cf7c"/><path stroke="#efd99b" d="M50 17v50M25 42h50M32 24l36 36m0-36L32 60M50 42 35 82m15-40 15 40M28 82h44"/><g fill="#e3a17b"><rect x="44" y="12" width="12" height="9" rx="3"/><rect x="70" y="37" width="12" height="9" rx="3"/><rect x="44" y="63" width="12" height="9" rx="3"/><rect x="18" y="37" width="12" height="9" rx="3"/></g><circle cx="50" cy="42" r="5" fill="#f7df9a"/>`,
  seaside: `<circle cx="63" cy="35" r="14" fill="#f3c96e"/><path fill="#e4bf86" d="M14 68q25-17 72 0v13H14Z"/><path fill="none" stroke="#9cc8bd" d="M13 61q10-7 20 0t20 0t20 0t15 0M16 73q11-5 22 0t22 0t22 0"/><path stroke="#d2b17f" d="m29 70 6-33"/><path fill="#8eb28c" d="M35 36Q15 22 13 41q12-6 22-5Zm0 0Q51 19 56 37q-12-4-21-1Zm0 0Q27 16 20 23q8 5 15 13Z"/>`,
  festival: `<path stroke="#a7bfa0" d="M13 35q37 15 74 0M25 39v8m25-3v9m25-14v8"/><g fill="#efb975"><rect x="18" y="47" width="14" height="20" rx="5"/><rect x="43" y="53" width="14" height="20" rx="5"/><rect x="68" y="47" width="14" height="20" rx="5"/></g><path stroke="#fff0b4" d="M25 52v10m25-4v10m25-16v10M57 12v7m-13-2 5 5m18-5-5 5m-17 5h-7m34 0h-7"/><circle cx="57" cy="27" r="3" fill="#ffdf8e"/>`,
  riverside: `<path fill="none" stroke="#dcb1a0" d="M19 48a31 31 0 0 1 62 0"/><path fill="none" stroke="#ebd69d" d="M26 48a24 24 0 0 1 48 0"/><path fill="none" stroke="#a2c19c" d="M33 48a17 17 0 0 1 34 0"/><path fill="#79aaa5" d="M14 57q18-11 36 1t36-1v20H14Z"/><path fill="none" stroke="#c4ded0" d="M18 68q8-5 16 0t16 0t16 0t16 0"/><path fill="#e6c791" d="M28 58q22-22 44 0v6H28Z"/><path fill="#405f54" d="M39 60q11-13 22 0Z"/>`,
  lagoon: `<ellipse cx="50" cy="68" rx="37" ry="14" fill="#76a59d"/><path fill="#9bbb86" d="M27 69q23-24 45 0l-20 7Z"/><path fill="#e1b3ab" d="M50 62q-28-5-23-23 14 2 23 17 9-15 23-17 5 18-23 23Z"/><path fill="#f5dbbc" d="M50 60Q32 42 50 24q18 18 0 36Z"/><path stroke="#c5d9ba" d="M19 74h10m42-9h10"/>`,
  summit: `<path fill="#7e9a8d" d="m9 80 31-52 17 25 13-15 22 42Z"/><path fill="#f4eed8" d="m27 50 13-22 14 22-10-4-7 7-4-8Zm35 0 8-12 9 17-9-5Z"/><path stroke="#e4c98c" d="M48 74 62 60l-8-5M40 28V13"/><path fill="#eab376" d="m41 13 15 5-15 5Z"/>`,
  castle: `<path fill="#c5d7c7" d="M14 76q-2-14 12-12 3-13 16-8 12-13 23-2 16-5 18 11 12 1 7 13H14Z"/><path fill="#c7b995" d="M26 38h13v32H26Zm35 0h13v32H61ZM38 47h24v25H38Z"/><path fill="#e3a27e" d="m22 39 11-20 10 20Zm35 0 11-20 10 20Z"/><path fill="#56736b" d="M44 72V61a6 6 0 0 1 12 0v11Z"/><path stroke="#f5daa0" d="M50 47V20"/><path fill="#f5cd78" d="m51 20 15 5-15 5Z"/>`,
};

export function travelLandmark(id) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="50" cy="80" rx="38" ry="8" fill="#102e29" opacity=".35"/>${landmarks[id] ?? landmarks.garden}</svg>`;
}
