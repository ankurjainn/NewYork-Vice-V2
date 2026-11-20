import type { ActiveMissionState, MissionDef, VehicleType } from './types';

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1_yellow_cab_rush',
    title: 'Fifth Ave Yellow Cab Rush',
    contact: 'Sal (Dispatch)',
    district: 'Washington Square',
    difficulty: 'Street',
    emotionTag: 'ADRENALINE',
    reward: 1800,
    timeLimitSec: 120,
    briefing:
      'High-roller broker missed his chopper at Wall Street. Grab any NYC Yellow Cab, scoop him by Washington Square Arch, and beat the closing bell!',
    startX: 0,
    startZ: -80,
    steps: [
      {
        id: 'm1_s1',
        type: 'board_vehicle',
        label: 'Get inside an NYC Yellow Cab',
        requiredVehicle: 'taxi',
        radioCallout: 'Sal: Grab any Yellow Cab on the avenue — clock is ticking!',
      },
      {
        id: 'm1_s2',
        type: 'reach',
        label: 'Pick up broker at Washington Square Arch',
        targetX: 0,
        targetZ: -80,
        radius: 13,
        radioCallout: 'Broker: Step on it! I got millions riding on the Wall Street bell!',
      },
      {
        id: 'm1_s3',
        type: 'deliver',
        label: 'Rush broker to Wall Street Exchange',
        targetX: 56,
        targetZ: -20,
        radius: 14,
        radioCallout: 'Sal: Clean drop! Broker tipped big — welcome to New York Vice.',
      },
    ],
  },
  {
    id: 'm19_soho_undercover_handshake',
    title: 'The SoHo Espresso Sting',
    contact: 'Detective Vera',
    district: 'Washington Square',
    difficulty: 'Street',
    emotionTag: 'UNDERCOVER',
    isInteractive: true,
    reward: 3400,
    timeLimitSec: 185,
    briefing:
      'Skip the sirens — work the street! Question informant Louie Keys, change into a fresh disguise [O], wiretap the Syndicate relay box [E], and report back to Vera.',
    startX: -9.5,
    startZ: -48,
    steps: [
      {
        id: 'm19_s1',
        type: 'talk_npc',
        label: 'Question informant Louie Keys [E] near Washington Square',
        targetX: -9.5,
        targetZ: -48,
        radius: 5.5,
        npcName: 'Louie Keys',
        npcShirtHex: 0x0f766e,
        npcDialogue:
          'Louie Keys: "Keep your voice down! Syndicate relay box is two blocks down Fifth Ave. Swap your jacket [O] first so their spotters don’t make you!"',
        radioCallout: 'Vera: Smart tip. Press [O] anywhere to swap into a fresh NYC disguise!',
      },
      {
        id: 'm19_s2',
        type: 'change_outfit',
        label: 'Swap into a fresh NYC street disguise — press [O]',
        radioCallout: 'Vera: Sharp look! Now head to the Syndicate relay box on Fifth Ave and wiretap it [E].',
      },
      {
        id: 'm19_s3',
        type: 'perform_task',
        label: 'Wiretap the Syndicate Relay Box [E] on Fifth Ave',
        targetX: 9.5,
        targetZ: -14,
        radius: 5.2,
        taskActionLabel: 'Wiretap Syndicate Relay Box',
        taskPropKind: 'terminal',
        radioCallout: 'Vera: Signal tapped! Come brief me by Washington Square South!',
      },
      {
        id: 'm19_s4',
        type: 'talk_npc',
        label: 'Hand intel to Detective Vera [E] at Washington Square',
        targetX: -9.5,
        targetZ: -34,
        radius: 5.5,
        npcName: 'Detective Vera',
        npcShirtHex: 0x1d4ed8,
        npcDialogue:
          'Detective Vera: "Textbook undercover work, Camila! That feed just blew their whole racket open. Here’s $3,400 off the books."',
        radioCallout: 'Vera: Clean undercover op! $3,400 wired!',
      },
    ],
  },
  {
    id: 'm20_manhattan_blackout_fix',
    title: 'Manhattan Grid Repair Crew',
    contact: 'Chief Salma (ConEd)',
    district: 'Union Square',
    difficulty: 'Street',
    emotionTag: 'FIELD TASK',
    isInteractive: true,
    reward: 3800,
    timeLimitSec: 200,
    briefing:
      'Lower Manhattan lost grid power! Meet Chief Engineer Salma, recover 3 scattered Fuse Cores on foot or by cab, repair the sparking transformer [E], and grab a celebratory bite at any NYC shop!',
    startX: 9.5,
    startZ: 16,
    steps: [
      {
        id: 'm20_s1',
        type: 'talk_npc',
        label: 'Meet Chief Engineer Salma [E] on Fifth Ave',
        targetX: 9.5,
        targetZ: 16,
        radius: 5.5,
        npcName: 'Chief Salma',
        npcShirtHex: 0xea580c,
        npcDialogue:
          'Chief Salma: "Thank goodness you’re here! Three insulated fuse cores fell off our truck down the block. Grab all 3 and patch the transformer!"',
        radioCallout: 'Salma: Scoop all 3 glowing Fuse Cores scattered around the avenue!',
      },
      {
        id: 'm20_s2',
        type: 'collect_items',
        label: 'Collect 3 scattered Fuse Cores',
        targetCount: 3,
        collectPoints: [
          { x: -9.5, z: 32, label: 'Fuse Core #1' },
          { x: 9.5, z: 48, label: 'Fuse Core #2' },
          { x: 28, z: 56, label: 'Fuse Core #3' },
        ],
        radioCallout: 'Salma: All 3 cores secured! Head to the sparking street transformer and press [E] to repair!',
      },
      {
        id: 'm20_s3',
        type: 'perform_task',
        label: 'Repair the Sparking Transformer [E]',
        targetX: 46,
        targetZ: 56,
        radius: 5.4,
        taskActionLabel: 'Install Fuse Cores & Restore Grid',
        taskPropKind: 'generator',
        radioCallout: 'Salma: Power is back across Midtown! Treat yourself — buy anything from any NYC shopkeeper [E]!',
      },
      {
        id: 'm20_s4',
        type: 'shop_buy',
        label: 'Buy a snack or perk from any NYC Building Shop [E]',
        radioCallout: 'Salma: On the city’s tab! Full $3,800 bonus deposited!',
      },
    ],
  },
  {
    id: 'm21_central_park_hustle',
    title: 'Central Park Pitch & Payback',
    contact: 'Captain Vikram',
    district: 'Union Square',
    difficulty: 'Street',
    emotionTag: 'PARK SPORTS',
    isInteractive: true,
    reward: 4200,
    timeLimitSec: 210,
    briefing:
      'A street hustler stole the charity match cup at Central Park! Talk to Captain Vikram, confront & shove Slick Eddie [Q] to take it back, then join Pickup Cricket [F] and score 6+ runs!',
    startX: 22,
    startZ: 101,
    steps: [
      {
        id: 'm21_s1',
        type: 'talk_npc',
        label: 'Talk to Captain Vikram [E] at Central Park South',
        targetX: 22,
        targetZ: 101,
        radius: 5.5,
        npcName: 'Captain Vikram',
        npcShirtHex: 0x16a34a,
        npcDialogue:
          'Captain Vikram: "Slick Eddie swiped our charity trophy and is bragging by the north-west trees! Go shove him [Q] to take it back, then smash 6 runs for our team!"',
        radioCallout: 'Vikram: Walk up to Slick Eddie in Central Park and press [Q] to confront him!',
      },
      {
        id: 'm21_s2',
        type: 'confront_target',
        label: 'Confront & shove Slick Eddie [Q] at Central Park',
        targetX: 14,
        targetZ: 72,
        radius: 5.0,
        npcName: 'Slick Eddie',
        npcShirtHex: 0x991b1b,
        npcDialogue: 'Slick Eddie: "Alright, alright! Take the shiny cup back — easy with the shove!"',
        radioCallout: 'Vikram: Trophy recovered! Step onto the grass, press [F] to Join Cricket, and score 6 runs!',
      },
      {
        id: 'm21_s3',
        type: 'park_sport_score',
        label: 'Join Central Park Cricket [F] and score 6+ runs',
        targetX: 28,
        targetZ: 84,
        radius: 18,
        sportVenueId: 'central_park_cricket',
        targetScore: 6,
        radioCallout: 'Vikram: What a knock! Central Park goes wild — $4,200 purse is yours!',
      },
    ],
  },
  {
    id: 'm22_times_square_reels',
    title: 'Stolen Film Reels Scavenger',
    contact: 'Director Maya',
    district: 'Midtown West',
    difficulty: 'High Stakes',
    emotionTag: 'SCAVENGER',
    isInteractive: true,
    reward: 4600,
    timeLimitSec: 210,
    briefing:
      'Rival producers hid 3 priceless 35mm premiere reels across Times Square! Meet Indie Director Maya, track down all 3 hidden film cases, and upload the master feed at the Broadway terminal [E].',
    startX: 47,
    startZ: 214,
    steps: [
      {
        id: 'm22_s1',
        type: 'talk_npc',
        label: 'Meet Indie Director Maya [E] near Times Square',
        targetX: 47,
        targetZ: 214,
        radius: 5.5,
        npcName: 'Director Maya',
        npcShirtHex: 0x9333ea,
        npcDialogue:
          'Director Maya: "Our premiere starts in minutes! They stashed 3 gold film cases right around Times Square. Recover all 3 and beam them from the Broadway terminal!"',
        radioCallout: 'Maya: Check your minimap — grab all 3 glowing 35mm Film Cases around Times Square!',
      },
      {
        id: 'm22_s2',
        type: 'collect_items',
        label: 'Recover 3 Stolen 35mm Film Reels around Times Square',
        targetCount: 3,
        collectPoints: [
          { x: 64.5, z: 224, label: 'Film Reel #1' },
          { x: 56, z: 235, label: 'Film Reel #2' },
          { x: 47.5, z: 224, label: 'Film Reel #3' },
        ],
        radioCallout: 'Maya: You got all 3 reels! Rush to the Times Square Broadcast Terminal and press [E]!',
      },
      {
        id: 'm22_s3',
        type: 'perform_task',
        label: 'Upload Master Reel at Times Square Terminal [E]',
        targetX: 56,
        targetZ: 224,
        radius: 5.8,
        taskActionLabel: 'Upload 35mm Premiere Feed',
        taskPropKind: 'terminal',
        radioCallout: 'Maya: The billboards just lit up with our premiere! $4,600 wired!',
      },
    ],
  },
  {
    id: 'm2_soho_vip_drop',
    title: 'SoHo Gallery VIP Drop',
    contact: 'Elena (Curator)',
    district: 'SoHo Lofts',
    difficulty: 'Street',
    emotionTag: 'PRESTIGE',
    reward: 2400,
    timeLimitSec: 135,
    briefing:
      'A stolen Basquiat print needs to move from Battery Park to SoHo Cast-Iron Plaza before rival collectors show up.',
    startX: -56,
    startZ: 28,
    steps: [
      {
        id: 'm2_s1',
        type: 'reach',
        label: 'Collect art crate at Battery Park Promenade',
        targetX: -56,
        targetZ: 28,
        radius: 12,
        radioCallout: 'Elena: Crate secured! Head east through Financial District to SoHo.',
      },
      {
        id: 'm2_s2',
        type: 'deliver',
        label: 'Deliver crate to SoHo Cast-Iron Plaza',
        targetX: 112,
        targetZ: 140,
        radius: 14,
        radioCallout: 'Elena: Gallery doors locked. Wire just hit your account!',
      },
    ],
  },
  {
    id: 'm3_liberty_harbor_run',
    title: 'Lady Liberty Smuggler Run',
    contact: 'Captain O’Malley',
    district: 'Hudson Harbor',
    difficulty: 'High Stakes',
    emotionTag: 'ADVENTURE',
    reward: 3500,
    timeLimitSec: 155,
    briefing:
      'Syndicate dropped a waterproof ledger off Liberty Island! Board a speedboat at Battery Ferry Pier, round the Statue of Liberty, and dock at Chelsea Piers.',
    startX: -116,
    startZ: -95,
    steps: [
      {
        id: 'm3_s1',
        type: 'board_vehicle',
        label: 'Board the Hudson Coast Guard Boat at Battery Pier',
        requiredVehicle: 'speedboat',
        radioCallout: 'O’Malley: Throttle up! Cut across the Hudson swells toward Lady Liberty!',
      },
      {
        id: 'm3_s2',
        type: 'reach',
        label: 'Scoop floating ledger off Liberty Island',
        targetX: -168,
        targetZ: -176,
        radius: 22,
        radioCallout: 'O’Malley: Ledger aboard! Gun it south along the West Side to Chelsea Piers!',
      },
      {
        id: 'm3_s3',
        type: 'deliver',
        label: 'Dock at Chelsea Piers Marina',
        targetX: -118,
        targetZ: 208,
        radius: 22,
        radioCallout: 'O’Malley: Smooth sailing, Captain! Clean $3,500 payout!',
      },
    ],
  },
  {
    id: 'm4_staten_ferry_heist',
    title: 'Staten Island Ferry Rescue',
    contact: 'Maya (Harbor Ops)',
    district: 'Battery Ferry Pier',
    difficulty: 'High Stakes',
    emotionTag: 'HEROISM',
    reward: 3800,
    timeLimitSec: 165,
    briefing:
      'A commuter ferry crew is stranded out by the Coney Island channel buoy during rising swells. Take the Staten Island Ferry helm and haul them safely back to Battery Pier!',
    startX: -112,
    startZ: 8,
    recommendedWeather: 'light_drizzle',
    steps: [
      {
        id: 'm4_s1',
        type: 'board_vehicle',
        label: 'Board the Staten Island Ferry at Pier 25',
        requiredVehicle: 'ferry',
        radioCallout: 'Maya: Heavy orange steel — lean into the Hudson waves and head south!',
      },
      {
        id: 'm4_s2',
        type: 'reach',
        label: 'Reach Coney Island Boardwalk Pier',
        targetX: -114,
        targetZ: 402,
        radius: 26,
        radioCallout: 'Maya: Passengers aboard! Bring her back north to Battery Ferry Pier!',
      },
      {
        id: 'm4_s3',
        type: 'deliver',
        label: 'Return safely to Battery Ferry Pier',
        targetX: -116,
        targetZ: -95,
        radius: 26,
        radioCallout: 'Maya: New York owes you one! Full maritime bonus paid!',
      },
    ],
  },
  {
    id: 'm5_fdr_skyline_drift',
    title: 'FDR Viaduct Midnight Drift',
    contact: 'Rico (Underground)',
    district: 'Financial District',
    difficulty: 'High Stakes',
    emotionTag: 'THRILL',
    reward: 3200,
    timeLimitSec: 125,
    briefing:
      'Boost a Manhattan GT Coupe, tear up the elevated FDR Express Viaduct, and cross the Brooklyn Bridge Connector before the street crew folds!',
    startX: -10,
    startZ: 56,
    steps: [
      {
        id: 'm5_s1',
        type: 'board_vehicle',
        label: 'Commandeer a Manhattan GT Coupe',
        requiredVehicle: 'sports',
        radioCallout: 'Rico: Hold Shift for Nitro — climb the FDR Viaduct ramp!',
      },
      {
        id: 'm5_s2',
        type: 'reach',
        label: 'Hit top speed on the FDR Viaduct flyover',
        targetX: 84,
        targetZ: 56,
        radius: 16,
        radioCallout: 'Rico: Crowd went wild! Now swing onto Brooklyn Bridge Connector!',
      },
      {
        id: 'm5_s3',
        type: 'deliver',
        label: 'Finish run at Brooklyn Bridge Ramp',
        targetX: 168,
        targetZ: 140,
        radius: 16,
        radioCallout: 'Rico: Record time across Manhattan! Here’s your purse!',
      },
    ],
  },
  {
    id: 'm6_times_square_escape',
    title: 'Times Square Red Alert',
    contact: 'Dante (Fixer)',
    district: 'Midtown West',
    difficulty: 'High Stakes',
    emotionTag: 'TENSION',
    reward: 4100,
    timeLimitSec: 145,
    initialWantedHeat: 115,
    briefing:
      'NYPD spotted your plates right under the Times Square billboards! Shake the 3-star pursuit and lay low at Harlem Rucker Courts.',
    startX: 56,
    startZ: 224,
    steps: [
      {
        id: 'm6_s1',
        type: 'reach',
        label: 'Grab decoy briefcase in Times Square',
        targetX: 56,
        targetZ: 224,
        radius: 15,
        radioCallout: 'Dante: Sirens closing in! Ditch the cruisers — watch for officers jumping out!',
      },
      {
        id: 'm6_s2',
        type: 'lose_wanted',
        label: 'Evade NYPD until Wanted stars clear',
        radioCallout: 'Dante: Dispatch went quiet! Head up to Harlem Rucker to collect.',
      },
      {
        id: 'm6_s3',
        type: 'deliver',
        label: 'Meet Dante at Harlem Rucker Courts',
        targetX: 252,
        targetZ: 168,
        radius: 16,
        radioCallout: 'Dante: Ice cold under pressure! Payout sent.',
      },
    ],
  },
  {
    id: 'm7_chinatown_convoy',
    title: 'Canal Street Convoy Takedown',
    contact: 'Kenji (Canal Tech)',
    district: 'Chinatown',
    difficulty: 'Syndicate',
    emotionTag: 'VENGEANCE',
    reward: 5200,
    timeLimitSec: 170,
    spawnConvoyCount: 2,
    initialWantedHeat: 65,
    briefing:
      'Two Five Families Armored Vans are hauling stolen Canal Street microchips. Ram both vans off the road until they smoke out!',
    startX: 168,
    startZ: 224,
    steps: [
      {
        id: 'm7_s1',
        type: 'intercept_convoy',
        label: 'Ram & disable 2 Syndicate Armored Vans',
        targetCount: 2,
        radioCallout: 'Kenji: Both vans wrecked! Grab the payout back in Chinatown!',
      },
      {
        id: 'm7_s2',
        type: 'deliver',
        label: 'Return to Canal Street Market',
        targetX: 168,
        targetZ: 224,
        radius: 15,
        radioCallout: 'Kenji: Chinatown owes you big! $5,200 wired!',
      },
    ],
  },
  {
    id: 'm8_noreaster_storm_run',
    title: "Nor'easter Blackout Courier",
    contact: 'Dr. Patel',
    district: 'Midtown East',
    difficulty: 'High Stakes',
    emotionTag: 'URGENCY',
    reward: 3900,
    timeLimitSec: 135,
    recommendedWeather: 'heavy_monsoon',
    briefing:
      'An Atlantic Nor’easter knocked out power in the Bronx! Race emergency backup cells from Wall Street to Bronx Arena through slick rain and lightning.',
    startX: 56,
    startZ: 0,
    steps: [
      {
        id: 'm8_s1',
        type: 'reach',
        label: 'Load battery cells at Wall Street',
        targetX: 56,
        targetZ: 0,
        radius: 14,
        radioCallout: 'Dr. Patel: Roads are flooded — easy on the corners! Go north-east to Bronx Arena!',
      },
      {
        id: 'm8_s2',
        type: 'deliver',
        label: 'Deliver power cells to Bronx Ballpark & Arena',
        targetX: 280,
        targetZ: 56,
        radius: 18,
        radioCallout: 'Dr. Patel: Stadium floodlights are back online! Heroic drive!',
      },
    ],
  },
  {
    id: 'm9_central_park_ambush',
    title: 'Central Park Double-Cross',
    contact: 'Tariq (Informant)',
    district: 'Union Square',
    difficulty: 'Syndicate',
    emotionTag: 'BETRAYAL',
    reward: 4500,
    timeLimitSec: 140,
    spawnRivals: 4,
    briefing:
      'Rival enforcers ambushed our pickup near Central Park Great Lawn! Break their perimeter, recover the drive, and deliver it to Washington Square.',
    startX: 28,
    startZ: 112,
    steps: [
      {
        id: 'm9_s1',
        type: 'reach',
        label: 'Recover encrypted drive beside Central Park',
        targetX: 28,
        targetZ: 112,
        radius: 13,
        radioCallout: 'Tariq: They’re swarming! Shove through or grab wheels — bolt to Washington Square!',
      },
      {
        id: 'm9_s2',
        type: 'deliver',
        label: 'Escape to Washington Square Arch',
        targetX: 0,
        targetZ: -80,
        radius: 14,
        radioCallout: 'Tariq: Made it out alive! Here’s $4,500 for the bruises.',
      },
    ],
  },
  {
    id: 'm10_mta_bus_express',
    title: 'MTA Crosstown Express',
    contact: 'Big Tony (Depot)',
    district: 'Midtown West',
    difficulty: 'Street',
    emotionTag: 'CHAOS',
    reward: 2900,
    timeLimitSec: 145,
    briefing:
      'MTA driver walked off mid-shift! Take the wheel of an MTA City Bus and barrel through Midtown West to Williamsburg without stopping!',
    startX: 56,
    startZ: 168,
    steps: [
      {
        id: 'm10_s1',
        type: 'board_vehicle',
        label: 'Hijack or board an MTA City Bus',
        requiredVehicle: 'bus',
        radioCallout: 'Tony: Heavy steel! Watch the red lights and swing down to Williamsburg!',
      },
      {
        id: 'm10_s2',
        type: 'reach',
        label: 'Swing by Times Square Bus Stop',
        targetX: 56,
        targetZ: 224,
        radius: 16,
        radioCallout: 'Tony: Everybody onboard! Next stop: Williamsburg Plaza!',
      },
      {
        id: 'm10_s3',
        type: 'deliver',
        label: 'Park bus at Williamsburg Plaza',
        targetX: 112,
        targetZ: 336,
        radius: 16,
        radioCallout: 'Tony: Best crosstown run in decades! Payday!',
      },
    ],
  },
  {
    id: 'm11_williamsburg_skyway',
    title: 'Williamsburg Skyway Burnout',
    contact: 'Sienna (Street Queen)',
    district: 'Williamsburg',
    difficulty: 'High Stakes',
    emotionTag: 'ADRENALINE',
    reward: 3700,
    timeLimitSec: 130,
    briefing:
      'Brooklyn street racers say nobody can clear the Williamsburg Skyway flyover and hit Coney Island Boardwalk in under two minutes. Prove them wrong!',
    startX: 112,
    startZ: 280,
    steps: [
      {
        id: 'm11_s1',
        type: 'reach',
        label: 'Launch onto Williamsburg Skyway flyover',
        targetX: 112,
        targetZ: 280,
        radius: 16,
        radioCallout: 'Sienna: Pure speed! Keep it pinned west toward Coney Island!',
      },
      {
        id: 'm11_s2',
        type: 'deliver',
        label: 'Slide into Coney Island Boardwalk',
        targetX: -56,
        targetZ: 415,
        radius: 16,
        radioCallout: 'Sienna: Brooklyn bows down! $3,700 is all yours!',
      },
    ],
  },
  {
    id: 'm12_nypd_undercover',
    title: 'NYPD Cruiser Joyride',
    contact: 'Vinny (Fixer)',
    district: 'Midtown East',
    difficulty: 'Syndicate',
    emotionTag: 'DEFIANCE',
    reward: 4800,
    timeLimitSec: 155,
    briefing:
      'Steal a genuine NYPD Interceptor SUV, blast sirens past Empire Spire, lose the pursuit, and stash it at Flushing Meadows!',
    startX: 224,
    startZ: 56,
    steps: [
      {
        id: 'm12_s1',
        type: 'board_vehicle',
        label: 'Commandeer an NYPD Interceptor SUV',
        requiredVehicle: 'police',
        radioCallout: 'Vinny: You actually took a precinct cruiser! Buzz Empire Spire!',
      },
      {
        id: 'm12_s2',
        type: 'reach',
        label: 'Buzz past Empire Midtown Spire',
        targetX: 224,
        targetZ: 56,
        radius: 16,
        radioCallout: 'Vinny: Now lose the real cops before dropping it in Queens!',
      },
      {
        id: 'm12_s3',
        type: 'lose_wanted',
        label: 'Shake NYPD heat completely',
        radioCallout: 'Vinny: Coast is clear — roll into Flushing Meadows!',
      },
      {
        id: 'm12_s4',
        type: 'deliver',
        label: 'Deliver cruiser to Flushing Meadows Park',
        targetX: 392,
        targetZ: 252,
        radius: 18,
        radioCallout: 'Vinny: Legendary heist! $4,800 wired!',
      },
    ],
  },
  {
    id: 'm13_rucker_championship',
    title: 'Rucker Park Gold Trophy',
    contact: 'Andre (Harlem)',
    district: 'Harlem Rucker',
    difficulty: 'Street',
    emotionTag: 'PRIDE',
    reward: 2600,
    timeLimitSec: 120,
    briefing:
      'Rival crew stole the Rucker Park championship trophy from Harlem! Grab it near West 4th Cage Courts and race it back uptown before tip-off.',
    startX: 28,
    startZ: 392,
    spawnRivals: 2,
    steps: [
      {
        id: 'm13_s1',
        type: 'reach',
        label: 'Reclaim trophy at West 4th St Cage',
        targetX: 28,
        targetZ: 392,
        radius: 15,
        radioCallout: 'Andre: Got the hardware! Floor it uptown to Harlem Rucker!',
      },
      {
        id: 'm13_s2',
        type: 'deliver',
        label: 'Return trophy to Harlem Rucker Courts',
        targetX: 252,
        targetZ: 168,
        radius: 16,
        radioCallout: 'Andre: Rucker stays undefeated! Appreciate you, legend!',
      },
    ],
  },
  {
    id: 'm14_flushing_cup_express',
    title: 'Queens Cricket Trophy Run',
    contact: 'Priya (Queens League)',
    district: 'Flushing Meadows',
    difficulty: 'Street',
    emotionTag: 'JOY',
    reward: 2800,
    timeLimitSec: 135,
    briefing:
      'The NYC Park Cricket Cup kicks off at Flushing Meadows in two minutes! Haul the match kits from Central Park Great Lawn straight across the Bronx Expressway.',
    startX: 28,
    startZ: 112,
    steps: [
      {
        id: 'm14_s1',
        type: 'reach',
        label: 'Pick up cricket kits at Central Park Great Lawn',
        targetX: 28,
        targetZ: 112,
        radius: 15,
        radioCallout: 'Priya: Bats and pads loaded! Take the Bronx Expressway east to Flushing Meadows!',
      },
      {
        id: 'm14_s2',
        type: 'deliver',
        label: 'Deliver match kits to Flushing Meadows Park',
        targetX: 392,
        targetZ: 252,
        radius: 18,
        radioCallout: 'Priya: Toss is underway! Step onto the grass and press [F] to bat anytime!',
      },
    ],
  },
  {
    id: 'm15_pedicab_hustle',
    title: 'Village Pedicab Hustle',
    contact: 'Chloe (Chelsea)',
    district: 'Chelsea Piers',
    difficulty: 'Street',
    emotionTag: 'FUN',
    reward: 2200,
    timeLimitSec: 130,
    briefing:
      'Tourists want the wildest sightseeing ride in NYC! Hop in an NYC Pedicab Trike and weave from Chelsea Piers to Washington Square.',
    startX: -56,
    startZ: 224,
    steps: [
      {
        id: 'm15_s1',
        type: 'board_vehicle',
        label: 'Hop into an NYC Pedicab Trike',
        requiredVehicle: 'auto',
        radioCallout: 'Chloe: Nimble on corners! Scoot down to Chelsea Piers!',
      },
      {
        id: 'm15_s2',
        type: 'reach',
        label: 'Pick up sightseers at Chelsea Piers',
        targetX: -56,
        targetZ: 224,
        radius: 15,
        radioCallout: 'Chloe: Hold onto your hats! Zip straight up to Washington Square!',
      },
      {
        id: 'm15_s3',
        type: 'deliver',
        label: 'Drop sightseers at Washington Square',
        targetX: 0,
        targetZ: -56,
        radius: 15,
        radioCallout: 'Chloe: Five-star review and a fat NYC tip!',
      },
    ],
  },
  {
    id: 'm16_bronx_syndicate_siege',
    title: 'Bronx Arena Syndicate Siege',
    contact: 'Hector (Garage)',
    district: 'Bronx Stadium',
    difficulty: 'Syndicate',
    emotionTag: 'INTENSITY',
    reward: 5600,
    timeLimitSec: 165,
    spawnRivals: 5,
    spawnConvoyCount: 2,
    initialWantedHeat: 115,
    briefing:
      'The Syndicate rolled two armored trucks outside Bronx Ballpark to muscle the arena! Smash both vans and lose NYPD across the viaducts.',
    startX: 280,
    startZ: 56,
    steps: [
      {
        id: 'm16_s1',
        type: 'intercept_convoy',
        label: 'Ram & disable 2 Syndicate Vans',
        targetCount: 2,
        radioCallout: 'Hector: Both vans out of action! Now lose NYPD!',
      },
      {
        id: 'm16_s2',
        type: 'lose_wanted',
        label: 'Evade NYPD pursuit',
        radioCallout: 'Hector: Clean getaway — swing by Bronx Arena for the cash!',
      },
      {
        id: 'm16_s3',
        type: 'deliver',
        label: 'Collect reward at Bronx Ballpark Plaza',
        targetX: 280,
        targetZ: 112,
        radius: 16,
        radioCallout: 'Hector: Bronx belongs to you tonight! $5,600 deposited!',
      },
    ],
  },
  {
    id: 'm17_hudson_midnight_escape',
    title: 'Five Borough Heatwave',
    contact: 'Dante (Fixer)',
    district: 'Wall Street',
    difficulty: 'Syndicate',
    emotionTag: 'HIGH STAKES',
    reward: 6200,
    timeLimitSec: 175,
    initialWantedHeat: 165,
    recommendedWeather: 'heavy_monsoon',
    briefing:
      'Four-star citywide dragnet in a roaring Atlantic Nor’easter! Survive the chase from Wall Street, break sightlines, and reach Liberty Island or Battery Pier!',
    startX: 56,
    startZ: -28,
    steps: [
      {
        id: 'm17_s1',
        type: 'reach',
        label: 'Trigger decoy flare at Wall Street',
        targetX: 56,
        targetZ: -28,
        radius: 14,
        radioCallout: 'Dante: Four stars! Every NYPD cruiser in Manhattan is rolling — lose them!',
      },
      {
        id: 'm17_s2',
        type: 'lose_wanted',
        label: 'Break NYPD 4-star dragnet completely',
        radioCallout: 'Dante: You vanished into the storm! Meet me at Battery Ferry Pier!',
      },
      {
        id: 'm17_s3',
        type: 'deliver',
        label: 'Reach extraction at Battery Ferry Pier',
        targetX: -94,
        targetZ: -82,
        radius: 18,
        radioCallout: 'Dante: Untouchable! $6,200 wired!',
      },
    ],
  },
  {
    id: 'm18_king_of_new_york',
    title: 'King of New York Finale',
    contact: 'Sal & The Five Boroughs',
    district: 'Midtown East',
    difficulty: 'Syndicate',
    emotionTag: 'TRIUMPH',
    reward: 10000,
    timeLimitSec: 210,
    spawnConvoyCount: 2,
    initialWantedHeat: 115,
    recommendedWeather: 'clear_sunset',
    briefing:
      'One final statement across the whole city: crush the Syndicate’s last armored convoy, lose the precinct, and take your victory lap through Washington Square Arch!',
    startX: 168,
    startZ: 112,
    steps: [
      {
        id: 'm18_s1',
        type: 'intercept_convoy',
        label: 'Disable final 2 Syndicate Armored Vans',
        targetCount: 2,
        radioCallout: 'Sal: The Syndicate is finished in NYC! Now shake the cops!',
      },
      {
        id: 'm18_s2',
        type: 'lose_wanted',
        label: 'Clear all NYPD Wanted Stars',
        radioCallout: 'Sal: Sunset’s golden over Manhattan — roll under Washington Square Arch!',
      },
      {
        id: 'm18_s3',
        type: 'deliver',
        label: 'Take your victory lap at Washington Square Arch',
        targetX: 0,
        targetZ: -88,
        radius: 16,
        radioCallout: 'Sal: Every borough knows your name now — KING OF NEW YORK! +$10,000!',
      },
    ],
  },
];

export function getMissionById(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function createActiveMission(
  missionId: string,
  completedIds: string[],
): ActiveMissionState | null {
  const def = getMissionById(missionId);
  if (!def) return null;
  return {
    missionId: def.id,
    stepIndex: 0,
    timeRemaining: def.timeLimitSec,
    stepTimer: 0,
    convoyDisabled: 0,
    stepProgress: 0,
    collectedIndices: [],
    completedIds: [...completedIds],
  };
}

export interface MissionTickInput {
  dt: number;
  playerX: number;
  playerZ: number;
  vehicleType: VehicleType | null;
  wantedStars: number;
  convoyDisabledCount: number;
  /** Event flags triggered by player interactive actions during this frame */
  talkedToMissionNpc?: boolean;
  performedTask?: boolean;
  confrontedTarget?: boolean;
  boughtFromShop?: boolean;
  changedOutfit?: boolean;
  parkRunsEarnedDelta?: number;
  activeParkVenueId?: string | null;
}

export interface MissionTickOutcome {
  nextState: ActiveMissionState | null;
  status: 'active' | 'step_advanced' | 'completed' | 'failed_timeout';
  reward: number;
  bannerText?: string;
  itemCollectedIndex?: number;
}

export function evaluateMissionTick(
  state: ActiveMissionState,
  input: MissionTickInput,
): MissionTickOutcome {
  const def = getMissionById(state.missionId);
  if (!def) {
    return { nextState: null, status: 'failed_timeout', reward: 0 };
  }

  const next: ActiveMissionState = {
    ...state,
    timeRemaining: Math.max(0, state.timeRemaining - input.dt),
    stepTimer: state.stepTimer + input.dt,
    convoyDisabled: input.convoyDisabledCount,
    collectedIndices: [...(state.collectedIndices ?? [])],
    stepProgress: state.stepProgress ?? 0,
  };

  if (next.timeRemaining <= 0) {
    return {
      nextState: null,
      status: 'failed_timeout',
      reward: 0,
      bannerText: `Time expired on "${def.title}".`,
    };
  }

  const step = def.steps[next.stepIndex];
  if (!step) {
    return { nextState: null, status: 'completed', reward: def.reward };
  }

  let stepDone = false;
  let itemCollectedIndex: number | undefined;

  if (step.type === 'board_vehicle') {
    stepDone = input.vehicleType === step.requiredVehicle;
  } else if (step.type === 'reach' || step.type === 'deliver') {
    const tx = step.targetX ?? 0;
    const tz = step.targetZ ?? 0;
    const r = step.radius ?? 14;
    const d = Math.hypot(input.playerX - tx, input.playerZ - tz);
    stepDone = d <= r;
  } else if (step.type === 'lose_wanted') {
    stepDone = input.wantedStars === 0;
  } else if (step.type === 'intercept_convoy') {
    stepDone = input.convoyDisabledCount >= (step.targetCount ?? 2);
  } else if (step.type === 'survive_heat') {
    stepDone = next.stepTimer >= 12;
  } else if (step.type === 'talk_npc') {
    stepDone = Boolean(input.talkedToMissionNpc);
  } else if (step.type === 'perform_task') {
    stepDone = Boolean(input.performedTask);
  } else if (step.type === 'confront_target') {
    stepDone = Boolean(input.confrontedTarget);
  } else if (step.type === 'shop_buy') {
    stepDone = Boolean(input.boughtFromShop);
  } else if (step.type === 'change_outfit') {
    stepDone = Boolean(input.changedOutfit);
  } else if (step.type === 'park_sport_score') {
    const runs = input.parkRunsEarnedDelta ?? 0;
    const venueMatch = !step.sportVenueId || !input.activeParkVenueId || input.activeParkVenueId === step.sportVenueId;
    if (runs > 0 && venueMatch) {
      next.stepProgress += runs;
    }
    stepDone = next.stepProgress >= (step.targetScore ?? 6);
  } else if (step.type === 'collect_items') {
    const pts = step.collectPoints ?? [];
    const pickR = step.radius ?? 4.2;
    for (let i = 0; i < pts.length; i++) {
      if (next.collectedIndices.includes(i)) continue;
      if (Math.hypot(input.playerX - pts[i].x, input.playerZ - pts[i].z) <= pickR) {
        next.collectedIndices.push(i);
        next.stepProgress = next.collectedIndices.length;
        itemCollectedIndex = i;
        break;
      }
    }
    stepDone = next.collectedIndices.length >= (step.targetCount ?? pts.length);
  }

  if (!stepDone) {
    return { nextState: next, status: 'active', reward: 0, itemCollectedIndex };
  }

  const nextStepIdx = next.stepIndex + 1;
  if (nextStepIdx >= def.steps.length) {
    const completedIds = next.completedIds.includes(def.id)
      ? next.completedIds
      : [...next.completedIds, def.id];
    return {
      nextState: { ...next, stepIndex: nextStepIdx, stepProgress: 0, collectedIndices: [], completedIds },
      status: 'completed',
      reward: def.reward,
      bannerText: `${def.title} Passed! +$${def.reward.toLocaleString('en-US')}`,
      itemCollectedIndex,
    };
  }

  next.stepIndex = nextStepIdx;
  next.stepTimer = 0;
  next.stepProgress = 0;
  next.collectedIndices = [];
  const upcoming = def.steps[nextStepIdx];
  return {
    nextState: next,
    status: 'step_advanced',
    reward: 0,
    bannerText: step.radioCallout ?? upcoming.label,
    itemCollectedIndex,
  };
}
