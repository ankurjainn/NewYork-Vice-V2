import type { DistrictId, VehicleType } from './types';

export type NpcReactionReason =
  | 'wanted'
  | 'brawl'
  | 'near_miss'
  | 'honk'
  | 'nice_ride'
  | 'greeting';

export interface NpcReactionContext {
  npcName: string;
  district: DistrictId;
  distanceMeters: number;
  playerInVehicle: boolean;
  playerVehicleType: VehicleType | null;
  playerSpeedMps: number;
  playerHonkedRecently: boolean;
  playerShovedRecently: boolean;
  wantedStars: number;
  seed: number;
}

export interface NpcReactionResult {
  speaker: string;
  text: string;
  accent: 'amber' | 'teal' | 'red';
  reason: NpcReactionReason;
  priority: number;
}

export const NYC_PEDESTRIAN_NAMES: string[] = [
  'Sal',
  'Maya',
  'Dante',
  'Keisha',
  'Vinny',
  'Elena',
  'Tariq',
  'Chloe',
  'Hector',
  'Priya',
  'Andre',
  'Sienna',
  'Mikey',
  'Nadia',
  'Devon',
  'Gina',
  'Omar',
  'Tessa',
  'Rico',
  'Hannah',
];

// Alias for compatibility
export const MUMBAI_PEDESTRIAN_NAMES = NYC_PEDESTRIAN_NAMES;

const NEAR_MISS_LINES: string[] = [
  "Ay! I'm walkin' here! Use your brakes, pal!",
  'Whoa! You tryna turn me into a Manhattan pancake?!',
  'Yo, chill! Almost spilled my iced coffee all over my Timbs!',
  'Hey! Watch the crosswalk — this ain’t the FDR!',
  'Bro, slow down! Pedestrians got the right of way in New York!',
  'Easy with that bumper, boss! I got places to be!',
];

const HONK_LINES: string[] = [
  'Yeah, yeah, lay off the horn! Everybody’s in a rush in NYC!',
  'Honk all you want, pal — gridlock ain’t moving any faster!',
  'Classic Midtown — two seconds of green and everybody’s on the horn!',
  'Alright, alright, I’m crossing! Don’t blow a gasket!',
  'Beep-beep yourself! Welcome to New York City!',
];

const BRAWL_LINES: string[] = [
  'Yo! Keep your hands to yourself, tough guy!',
  'Back up! Don’t make me call the precinct on this corner!',
  'Relax, bro! Go shoot hoops at Rucker if you got that much energy!',
  'Whoa, chill out! Security’s watching this whole block!',
];

const WANTED_LINES: string[] = [
  'NYPD’s right on your tail! Cut down the side street!',
  'Yo, sirens everywhere! Get off the avenue before they box you in!',
  'Half the precinct is after you — duck into the park or grab a ferry!',
  'Whoa, don’t bring those flashing lights over by my stoop!',
];

const NICE_RIDE_LINES: string[] = [
  'Sheesh, clean Manhattan GT! Let that V8 echo off the skyscrapers!',
  'Now that’s a serious New York ride — don’t curb those rims!',
  'Ooh, fresh coupe! You heading to SoHo or racing the bridge?',
  'Look at that paint shining in the Hudson sunset! Respect!',
];

const DISTRICT_GREETINGS: Record<DistrictId, string[]> = {
  'Battery Park': [
    'Catch the golden sunset over Liberty Island from Battery Park!',
    'Staten Island Ferry’s boarding down the pier — best free view in NYC!',
    'Cool harbor breeze rolling right off the Hudson today.',
  ],
  'Wall Street': [
    'Markets just closed — everyone’s sprinting for the subway or a cab!',
    'Big money moves on Wall Street. Watch out for armored vans!',
    'Grab a double espresso before hitting the Exchange floor.',
  ],
  'Washington Square': [
    'Washington Square Arch looks unreal in this sunset light!',
    'Jazz trio’s jamming by the fountain — classic Village vibes.',
    'Keep it smooth through the Arch — NYU crowds everywhere!',
  ],
  'Battery Ferry Pier': [
    'Boats are fueled up at the slips! Hop aboard and cruise out to Liberty Island!',
    'Careful of the wakes out by the Hudson buoys — swells pick up fast!',
    'Need a quick escape from NYPD? Take a speedboat straight into the harbor!',
  ],
  'Hudson Harbor': [
    'Wide open Hudson Bay! Nothing beats sailing past Lady Liberty!',
    'Watch the Coast Guard cutters — they move quick across the channel!',
    'Pull up beside Liberty Island or Chelsea Piers and hit [E] to disembark!',
  ],
  'Union Square': [
    'Pickup cricket is popping off on Central Park Great Lawn! Go press [F] to bat!',
    'Grab a dirty-water hot dog or Halal platter from the park carts!',
    'Union Square greenmarket’s buzzing — best energy in Manhattan!',
  ],
  'SoHo Lofts': [
    'Check out the cast-iron lofts on Broadway — pure New York style.',
    'Dropped a paycheck on sneakers in SoHo, no regrets.',
    'SoHo streets get tight — watch the delivery bikes!',
  ],
  'Financial District': [
    'Supertall glass towers reflecting that golden hour glow!',
    'Stay sharp down in FiDi — the alleyways curve right into the bridge ramp.',
    'Armored trucks roll out of the Vault district every hour.',
  ],
  'Lower East Side': [
    'Katz’s Deli pastrami on rye will patch you right up, guaranteed!',
    'Fire escapes, street art, and the West 4th Cage courts right down the block!',
    'Grab a $1.50 slice and keep moving — LES never sleeps!',
  ],
  'Midtown West': [
    'Times Square billboards lighting up the whole sky tonight!',
    'Midtown cabs will cut across three lanes without blinking — stay alert!',
    'Hit the nitro on the avenues when the lights turn green!',
  ],
  'Brooklyn Bridge': [
    'Nothing like flying over the East River toward Brooklyn!',
    'Bridge traffic backs up fast — use the elevated viaduct!',
    'DUMBO waterfront views hit different at dusk.',
  ],
  Chinatown: [
    'Best dumplings and late-night tech deals on Canal Street!',
    'Neon signs glowing bright through Chinatown tonight!',
    'Watch the narrow corners — delivery vans double-park everywhere!',
  ],
  'Chelsea Piers': [
    'Chelsea Piers is packed — speedboats docked right along the Hudson!',
    'Sunset joggers own the West Side waterfront path!',
    'Dock your boat right at Pier 25 and walk straight into Midtown.',
  ],
  Williamsburg: [
    'Cold brew, vinyl shops, and loft rooftop views in Williamsburg!',
    'Brooklyn street art on every brick warehouse down here.',
    'Watch the overpass ramp — racers love launching off the Williamsburg Viaduct!',
  ],
  'Coney Island': [
    'Boardwalk lights, ocean air, and fresh hot dogs on Coney Island!',
    'Salty Atlantic breeze — hop on a boat from the Coney pier!',
    'Best place in the five boroughs to cool off after a chase.',
  ],
  'Midtown East': [
    'Art Deco spires towering right over Midtown East!',
    'Keep an eye on the traffic lights — NYPD cruisers patrol 5th Ave heavy.',
    'Empire spire’s lit gold tonight — you can see it from Queens!',
  ],
  'Bronx Stadium': [
    'Game night at Bronx Arena! You can hear the stadium roar blocks away!',
    'Grab a ballpark pretzel outside the gates — the crowd’s electric!',
    'Check out the floodlights blazing over the Bronx Stadium turf!',
  ],
  'Harlem Rucker': [
    'Pickup streetball at Rucker Park! Walk onto the court and press [F] to shoot!',
    'Harlem legends play here every evening — press [V] to spectate courtside!',
    'Smooth jazz pouring out of the brownstones on 125th.',
  ],
  'Flushing Meadows': [
    'Flushing Meadows Cricket Cup is live on the grass! Press [F] to join the over!',
    'Best halal cart in Queens is parked right beside the cricket boundary!',
    'Queens park crowd goes crazy whenever someone smashes a SIX!',
  ],
};

function pickBySeed<T>(items: T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % items.length;
  return items[idx];
}

export function evaluateNpcReaction(ctx: NpcReactionContext): NpcReactionResult | null {
  const {
    npcName,
    district,
    distanceMeters,
    playerInVehicle,
    playerVehicleType,
    playerSpeedMps,
    playerHonkedRecently,
    playerShovedRecently,
    wantedStars,
    seed,
  } = ctx;

  if (distanceMeters > 16) return null;

  if (playerInVehicle && playerSpeedMps >= 9.5 && distanceMeters <= 9.5) {
    return {
      speaker: `${npcName} (${district})`,
      text: pickBySeed(NEAR_MISS_LINES, seed),
      accent: 'red',
      reason: 'near_miss',
      priority: 5,
    };
  }

  if (!playerInVehicle && playerShovedRecently && distanceMeters <= 7.5) {
    return {
      speaker: `${npcName} (${district})`,
      text: pickBySeed(BRAWL_LINES, seed),
      accent: 'red',
      reason: 'brawl',
      priority: 4,
    };
  }

  if (playerInVehicle && playerHonkedRecently && distanceMeters <= 14.5) {
    return {
      speaker: `${npcName} (${district})`,
      text: pickBySeed(HONK_LINES, seed),
      accent: 'amber',
      reason: 'honk',
      priority: 3,
    };
  }

  if (wantedStars > 0 && distanceMeters <= 13.0) {
    return {
      speaker: `${npcName} (${district})`,
      text: pickBySeed(WANTED_LINES, seed),
      accent: 'red',
      reason: 'wanted',
      priority: 3,
    };
  }

  if (playerInVehicle && playerVehicleType === 'sports' && distanceMeters <= 12.0) {
    return {
      speaker: `${npcName} (${district})`,
      text: pickBySeed(NICE_RIDE_LINES, seed),
      accent: 'teal',
      reason: 'nice_ride',
      priority: 2,
    };
  }

  if (distanceMeters <= 7.5) {
    const lines = DISTRICT_GREETINGS[district] ?? DISTRICT_GREETINGS['Battery Park'];
    return {
      speaker: `${npcName} · ${district}`,
      text: pickBySeed(lines, seed),
      accent: 'teal',
      reason: 'greeting',
      priority: 1,
    };
  }

  return null;
}

export function getContextualTalkLine(
  district: DistrictId,
  wantedStars: number,
  seed: number,
): string {
  if (wantedStars > 0) {
    return pickBySeed(WANTED_LINES, seed);
  }
  const lines = DISTRICT_GREETINGS[district] ?? DISTRICT_GREETINGS['Battery Park'];
  return pickBySeed(lines, seed);
}
