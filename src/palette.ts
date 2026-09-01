/** Built-in DMC-like stranded cotton palette (hex + code + name). */
export type Floss = {
  code: string;
  name: string;
  hex: string;
};

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const PALETTE: Floss[] = [
  { code: "B5200", name: "Snow White", hex: "#FFFFFF" },
  { code: "Ecru", name: "Ecru", hex: "#F0E6D0" },
  { code: "3865", name: "Winter White", hex: "#FFFDF9" },
  { code: "822", name: "Beige Gray Light", hex: "#E7DCC8" },
  { code: "644", name: "Beige Gray Medium", hex: "#DDD0B8" },
  { code: "310", name: "Black", hex: "#000000" },
  { code: "3799", name: "Pewter Gray Very Dark", hex: "#424242" },
  { code: "413", name: "Pewter Gray Dark", hex: "#565656" },
  { code: "414", name: "Steel Gray Dark", hex: "#8C8C8C" },
  { code: "318", name: "Steel Gray Light", hex: "#ABABAB" },
  { code: "415", name: "Pearl Gray", hex: "#D1D1D1" },
  { code: "762", name: "Pearl Gray Very Light", hex: "#E8E8E8" },
  { code: "321", name: "Christmas Red", hex: "#C72C3B" },
  { code: "498", name: "Christmas Red Dark", hex: "#A7132B" },
  { code: "816", name: "Garnet", hex: "#970B24" },
  { code: "815", name: "Garnet Medium", hex: "#87071F" },
  { code: "814", name: "Garnet Dark", hex: "#7B001B" },
  { code: "666", name: "Bright Christmas Red", hex: "#E31D42" },
  { code: "304", name: "Christmas Red Medium", hex: "#B71C2B" },
  { code: "347", name: "Salmon Very Dark", hex: "#BF2D2D" },
  { code: "3328", name: "Salmon Dark", hex: "#E36D6D" },
  { code: "760", name: "Salmon", hex: "#F7A4A4" },
  { code: "761", name: "Salmon Light", hex: "#F8C4C4" },
  { code: "3713", name: "Salmon Very Light", hex: "#FDCBCB" },
  { code: "351", name: "Coral", hex: "#E96A57" },
  { code: "350", name: "Coral Medium", hex: "#E04D3E" },
  { code: "349", name: "Coral Dark", hex: "#D63A2F" },
  { code: "817", name: "Coral Red Very Dark", hex: "#BB1637" },
  { code: "352", name: "Coral Light", hex: "#FD9C88" },
  { code: "353", name: "Peach", hex: "#FED7C9" },
  { code: "608", name: "Orange Bright", hex: "#FD5F00" },
  { code: "606", name: "Orange Red Bright", hex: "#FA4800" },
  { code: "947", name: "Burnt Orange", hex: "#FF7B24" },
  { code: "946", name: "Burnt Orange Medium", hex: "#EB6307" },
  { code: "900", name: "Burnt Orange Dark", hex: "#D15807" },
  { code: "721", name: "Orange Spice Medium", hex: "#F27842" },
  { code: "722", name: "Orange Spice Light", hex: "#F8A06B" },
  { code: "402", name: "Mahogany Very Light", hex: "#F7AD75" },
  { code: "3776", name: "Mahogany Light", hex: "#CF721B" },
  { code: "975", name: "Golden Brown Dark", hex: "#914F12" },
  { code: "434", name: "Brown Light", hex: "#8F5A28" },
  { code: "433", name: "Brown Medium", hex: "#7A4F21" },
  { code: "801", name: "Coffee Brown Dark", hex: "#603813" },
  { code: "898", name: "Coffee Brown Very Dark", hex: "#4A2C14" },
  { code: "938", name: "Coffee Brown Ultra Dark", hex: "#3D2414" },
  { code: "3371", name: "Black Brown", hex: "#1E1108" },
  { code: "436", name: "Tan", hex: "#C99A67" },
  { code: "437", name: "Tan Light", hex: "#D9B48A" },
  { code: "738", name: "Tan Very Light", hex: "#E4C7A1" },
  { code: "739", name: "Tan Ultra Very Light", hex: "#F2E3C9" },
  { code: "445", name: "Lemon Light", hex: "#FFFDA5" },
  { code: "307", name: "Lemon", hex: "#FDE910" },
  { code: "444", name: "Lemon Dark", hex: "#FFD600" },
  { code: "973", name: "Canary Bright", hex: "#FFE300" },
  { code: "743", name: "Yellow Medium", hex: "#FFD669" },
  { code: "744", name: "Yellow Pale", hex: "#FFE793" },
  { code: "745", name: "Yellow Light Pale", hex: "#FFE9AD" },
  { code: "3822", name: "Straw Light", hex: "#F7D560" },
  { code: "3820", name: "Straw Dark", hex: "#E0B44B" },
  { code: "783", name: "Topaz Medium", hex: "#D69E2E" },
  { code: "782", name: "Topaz Dark", hex: "#C47E17" },
  { code: "780", name: "Topaz Ultra Very Dark", hex: "#946517" },
  { code: "472", name: "Avocado Green Ultra Light", hex: "#D4E294" },
  { code: "471", name: "Avocado Green Very Light", hex: "#AEBF54" },
  { code: "470", name: "Avocado Green Light", hex: "#94A535" },
  { code: "469", name: "Avocado Green", hex: "#728125" },
  { code: "937", name: "Avocado Green Medium", hex: "#3F6A21" },
  { code: "936", name: "Avocado Green Very Dark", hex: "#2F5517" },
  { code: "904", name: "Parrot Green Very Dark", hex: "#38761D" },
  { code: "905", name: "Parrot Green Dark", hex: "#4A8A22" },
  { code: "906", name: "Parrot Green Medium", hex: "#6BAA2A" },
  { code: "907", name: "Parrot Green Light", hex: "#A4D04A" },
  { code: "704", name: "Chartreuse Bright", hex: "#9ECF46" },
  { code: "703", name: "Chartreuse", hex: "#7BB53B" },
  { code: "702", name: "Kelly Green", hex: "#47A72A" },
  { code: "701", name: "Christmas Green Light", hex: "#3D8C23" },
  { code: "700", name: "Christmas Green Bright", hex: "#07731A" },
  { code: "699", name: "Christmas Green", hex: "#056517" },
  { code: "909", name: "Emerald Green Very Dark", hex: "#156F49" },
  { code: "910", name: "Emerald Green Dark", hex: "#187E52" },
  { code: "911", name: "Emerald Green Medium", hex: "#189058" },
  { code: "912", name: "Emerald Green Light", hex: "#27A465" },
  { code: "913", name: "Nile Green Medium", hex: "#6EC49A" },
  { code: "955", name: "Nile Green Light", hex: "#A2D6B5" },
  { code: "564", name: "Jade Very Light", hex: "#A7D9C3" },
  { code: "562", name: "Jade Medium", hex: "#539F7B" },
  { code: "561", name: "Jade Very Dark", hex: "#2C6A4A" },
  { code: "991", name: "Aquamarine Dark", hex: "#137C6D" },
  { code: "992", name: "Aquamarine", hex: "#42B3A1" },
  { code: "993", name: "Aquamarine Light", hex: "#7DCEC3" },
  { code: "807", name: "Peacock Blue", hex: "#64ABAB" },
  { code: "3766", name: "Peacock Blue Light", hex: "#99C7CE" },
  { code: "519", name: "Sky Blue", hex: "#7EB1C8" },
  { code: "518", name: "Wedgewood Light", hex: "#4F93A7" },
  { code: "517", name: "Wedgewood Dark", hex: "#3B6F86" },
  { code: "3765", name: "Peacock Blue Very Dark", hex: "#136075" },
  { code: "825", name: "Blue Dark", hex: "#3477B5" },
  { code: "826", name: "Blue Medium", hex: "#6B9FD4" },
  { code: "813", name: "Blue Light", hex: "#A1C2DE" },
  { code: "827", name: "Blue Very Light", hex: "#BDD4E7" },
  { code: "162", name: "Blue Ultra Very Light", hex: "#DBE9F2" },
  { code: "796", name: "Royal Blue Dark", hex: "#11416D" },
  { code: "797", name: "Royal Blue", hex: "#134B7C" },
  { code: "798", name: "Delft Blue Dark", hex: "#466A8E" },
  { code: "809", name: "Delft Blue", hex: "#748EB5" },
  { code: "800", name: "Delft Blue Pale", hex: "#C0D0E4" },
  { code: "333", name: "Blue Violet Very Dark", hex: "#5C4083" },
  { code: "340", name: "Blue Violet Medium", hex: "#A384C1" },
  { code: "341", name: "Blue Violet Light", hex: "#B7CBE2" },
  { code: "208", name: "Lavender Very Dark", hex: "#835B8D" },
  { code: "209", name: "Lavender Dark", hex: "#A37BA7" },
  { code: "210", name: "Lavender Medium", hex: "#C39BC3" },
  { code: "211", name: "Lavender Light", hex: "#E3CBE3" },
  { code: "550", name: "Violet Very Dark", hex: "#5C2C6E" },
  { code: "552", name: "Violet Medium", hex: "#803A7A" },
  { code: "553", name: "Violet", hex: "#A4498C" },
  { code: "554", name: "Violet Light", hex: "#DC9CBA" },
  { code: "718", name: "Plum", hex: "#9B3377" },
  { code: "915", name: "Plum Dark", hex: "#6A1F4A" },
  { code: "3607", name: "Plum Light", hex: "#C5538C" },
  { code: "3608", name: "Plum Very Light", hex: "#E07AAA" },
  { code: "3609", name: "Plum Ultra Light", hex: "#F1A6C4" },
  { code: "326", name: "Rose Very Dark", hex: "#B33C5B" },
  { code: "309", name: "Rose Dark", hex: "#D15B70" },
  { code: "335", name: "Rose", hex: "#DB6A7B" },
  { code: "899", name: "Rose Medium", hex: "#E27786" },
  { code: "3326", name: "Rose Light", hex: "#F0A0A8" },
  { code: "776", name: "Pink Medium", hex: "#FCB0B9" },
  { code: "818", name: "Baby Pink", hex: "#FFCBD2" },
  { code: "963", name: "Dusty Rose Ultra Very Light", hex: "#FFD7DD" },
  { code: "3831", name: "Raspberry Dark", hex: "#B3445B" },
  { code: "3832", name: "Raspberry Medium", hex: "#DB6174" },
  { code: "3833", name: "Raspberry Light", hex: "#E8929A" },
];

const RGBS: RGB[] = PALETTE.map((f) => hexToRgb(f.hex));

export function nearestFloss(r: number, g: number, b: number): Floss {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < RGBS.length; i++) {
    const [pr, pg, pb] = RGBS[i];
    const d = (pr - r) * (pr - r) + (pg - g) * (pg - g) + (pb - b) * (pb - b);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return PALETTE[best];
}

export function flossRgb(f: Floss): RGB {
  return hexToRgb(f.hex);
}
