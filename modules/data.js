export const THICKNESSES = [0.5, 1, 2, 5, 10, 20, 50];

export const REFERENCES = [
  { id: 'mmpa', title: 'Permanent Magnet Guidelines & Material Standards', publisher: 'Magnetic Materials Producers Association (MMPA)', url: 'https://www.magnets.org/', note: 'Industry terminology, grade designations and typical permanent-magnet property ranges.' },
  { id: 'kj', title: 'Magnet Materials, Grades and Safety', publisher: 'K&J Magnetics', url: 'https://www.kjmagnetics.com/', note: 'Representative NdFeB/ferrite grade data, pull-force caveats and handling safety.' },
  { id: 'arnold', title: 'Permanent Magnet Technologies', publisher: 'Arnold Magnetic Technologies', url: 'https://www.arnoldmagnetictechnologies.com/', note: 'Alnico, SmCo, NdFeB and flexible magnet characteristics.' },
  { id: 'matweb', title: 'Material Property Data', publisher: 'MatWeb', url: 'https://www.matweb.com/', note: 'Nominal density, conductivity and hardness ranges for metals and alloys.' },
  { id: 'worldsteel', title: 'Stainless Steel Grades and Properties', publisher: 'worldsteel / ISSF', url: 'https://worldsteel.org/', note: 'Stainless families, microstructure and corrosion behaviour.' },
  { id: 'outokumpu', title: 'Stainless Steel Handbook', publisher: 'Outokumpu', url: 'https://www.outokumpu.com/en/expertise/2020/stainless-steel-handbook', note: 'Grade-specific magnetic response, cold-work effects and physical properties.' },
  { id: 'nickel', title: 'Nickel and Nickel Alloy Data', publisher: 'Nickel Institute', url: 'https://nickelinstitute.org/', note: 'Nickel alloys, permeability and corrosion resistance.' },
  { id: 'copper', title: 'Copper Alloy Conductivity and Properties', publisher: 'Copper Development Association', url: 'https://copper.org/', note: 'Conductivity of copper, brass and bronze.' },
  { id: 'hyper', title: 'Magnetism and Electromagnetism', publisher: 'HyperPhysics, Georgia State University', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/magnetic/magcon.html', note: 'Field formulas, solenoids, dipoles and magnetic materials.' },
  { id: 'britannica', title: 'Magnetism', publisher: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/science/magnetism', note: 'Conceptual background on poles, domains and magnetic materials.' },
  { id: 'wiki-domain', title: 'Magnetic Domain', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Magnetic_domain', note: 'Domain structure and magnetization processes.' },
  { id: 'wiki-hyst', title: 'Magnetic Hysteresis', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Magnetic_hysteresis', note: 'B-H loops, remanence and coercivity.' },
  { id: 'wiki-curie', title: 'Curie Temperature', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Curie_temperature', note: 'Loss of ferromagnetic order above Tc.' },
  { id: 'wiki-eddy', title: 'Eddy Current', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Eddy_current', note: 'Induced currents, losses and AC shielding.' },
  { id: 'wiki-skin', title: 'Skin Effect', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Skin_effect', note: 'Skin-depth formula and conductor attenuation.' },
  { id: 'wiki-shield', title: 'Magnetic Shielding', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Magnetic_shielding', note: 'Flux shunting vs eddy-current shielding.' },
  { id: 'wiki-super', title: 'Superconductivity', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Superconductivity', note: 'Critical temperature/field/current, persistent currents and quench.' },
  { id: 'wiki-tesla', title: 'Tesla Coil', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tesla_coil', note: 'Resonant air-core transformer operation and safety.' },
  { id: 'wiki-earnshaw', title: "Earnshaw's Theorem", publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Earnshaw%27s_theorem', note: 'Limits of static passive magnetic levitation.' },
  { id: 'wiki-flux', title: 'Magnetic Flux', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Magnetic_flux', note: 'Flux, flux density and units.' },
  { id: 'wiki-perm', title: 'Permeability (electromagnetism)', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Permeability_(electromagnetism)', note: 'Relative permeability and material response.' },
  { id: 'wiki-tesla-unit', title: 'Tesla (unit)', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tesla_(unit)', note: 'SI unit of magnetic flux density.' }
];

export const MAGNETS = [
  {
    id: 'neodymium-bar', name: 'N52 Neodymium Bar', family: 'Neodymium (NdFeB)', tag: 'RARE EARTH', shape: 'bar',
    material: 'Nd2Fe14B with Ni-Cu-Ni coating', composition: 'Nd ~29-32 wt%, Fe ~64-68 wt%, B ~1 wt%',
    dimensions: { length: 60, width: 16, height: 12, display: '60 x 16 x 12 mm (representative specimen)' }, thickness: 12, grade: 'N52',
    br: [1.42, 1.48], coercivity: [836, 955], energy: [398, 422], maxTemp: 80, curie: 310, density: 7.5,
    strength: 'Highest commercially common remanence class; typical N52 Br 1.42-1.48 T.',
    description: 'A sintered Nd-Fe-B bar magnetized through its length.',
    applications: ['Motors and generators', 'Magnetic separators', 'Actuator assemblies'],
    advantages: ['Very high energy product', 'Strong field per unit volume'],
    limitations: ['Brittle', 'Requires coating', 'Pinch hazard'],
    color: '#ff4d61', references: ['kj', 'mmpa', 'arnold'],
    partsList: ['N52 NdFeB Block', 'Ni-Cu-Ni Triple Plating'],
    assemblyGuide: 'Handle with protective gloves. Keep clear of iron parts.',
    sourcingGuide: 'K&J Magnetics, McMaster-Carr, Specialty Magnet Suppliers'
  },
  {
    id: 'horseshoe', name: 'Alnico Horseshoe', family: 'Alnico', tag: 'CLASSROOM', shape: 'horseshoe',
    material: 'Alnico 5', composition: 'Al ~8 wt%, Ni ~14 wt%, Co ~24 wt%, Cu ~3 wt%, Fe balance',
    dimensions: { length: 80, width: 60, height: 20, display: '~80 x 60 x 20 mm envelope' }, thickness: 20, grade: 'Alnico 5',
    br: [1.25, 1.35], coercivity: [48, 56], energy: [40, 48], maxTemp: 450, curie: 860, density: 7.3,
    strength: 'High remanence with both poles side by side.',
    description: 'Classic U-shaped magnet with concentrated local field in the gap.',
    applications: ['Demonstrations', 'Sensors', 'Pickup tools'],
    advantages: ['High temperature stability', 'Corrosion resistant'],
    limitations: ['Low coercivity', 'Brittle cast material'],
    color: '#397cff', references: ['arnold', 'mmpa'],
    partsList: ['Cast Alnico 5 U-Frame', 'Soft Steel Keeper Bar'],
    assemblyGuide: 'Store with steel keeper bar across poles to preserve flux.',
    sourcingGuide: 'Educational science distributors, Arnold Magnetics'
  },
  {
    id: 'mega-neodymium-block', name: 'N52 Mega Neodymium Block (200x100x50mm)', family: 'Neodymium (NdFeB)', tag: 'MEGA MAGNET', shape: 'block',
    material: 'Sintered Nd2Fe14B N52 Nickel Plated', composition: 'Nd ~32 wt%, Fe ~67 wt%, B ~1 wt%',
    dimensions: { length: 200, width: 100, height: 50, display: '200 x 100 x 50 mm Mega Block (7.5 kg mass)' }, thickness: 50, grade: 'N52 Mega',
    br: [1.45, 1.50], coercivity: [880, 980], energy: [400, 425], maxTemp: 80, curie: 310, density: 7.5,
    strength: 'Massive holding force > 8,500 N (860 kgf / ~1,900 lbs pull force). Extreme pinch hazard!',
    description: 'A heavy industrial 7.5 kg N52 sintered NdFeB block magnetized through its 50 mm thickness. Generates an intense wide-reaching magnetic field capable of crushing bone if unhandled.',
    applications: ['Industrial magnetic separation', 'Maglev train propulsion', 'High-field research stages', 'Eddy current braking'],
    advantages: ['Massive magnetic flux volume', 'Enormous pull force', 'Deep field projection'],
    limitations: ['Severe crush/injury risk', 'Extremely difficult to uncouple from steel'],
    color: '#ff2a4b', references: ['kj', 'mmpa'],
    partsList: ['N52 NdFeB Block (200x100x50 mm)', 'Triple-layer Ni-Cu-Ni plating', 'Non-magnetic wooden/aluminum handling separator frame'],
    assemblyGuide: 'Handle strictly with non-magnetic mechanical clamps and wooden wedges. Keep at least 2 meters clear of iron objects and pacemakers.',
    sourcingGuide: 'Industrial rare-earth magnet manufacturers, university physics surplus, specialty magnetics suppliers.'
  },
  {
    id: 'bifilar-tesla-magnet', name: 'Tesla Bifilar Flat Pancake Coil', family: 'Tesla Resonator', tag: 'TESLA PATENT', shape: 'ring',
    material: 'Bifilar wound copper ribbon on dielectric former', composition: 'Double-insulated parallel copper conductors wound in flat spiral',
    dimensions: { diameter: 120, innerDiameter: 20, height: 8, display: '120 mm OD flat spiral pancake coil' }, thickness: 8, grade: 'US Patent #512,340',
    br: null, coercivity: null, energy: null, maxTemp: 120, curie: null, density: 8.9,
    strength: 'Stores up to 100x higher capacitive energy than standard coils due to large voltage difference between adjacent inter-turn bifilar wires.',
    description: 'Nikola Tesla\'s patented bifilar flat pancake coil (US Patent 512,340). By winding two parallel wires side-by-side and connecting them in series end-to-start, adjacent turns carry a large voltage difference, multiplying self-capacitance and resonant energy storage.',
    applications: ['Wireless energy transmission', 'Resonant induction heating', 'High-Q tank circuits', 'Free-space energy research'],
    advantages: ['100x higher internal capacitive energy storage', 'Self-resonant frequency tuning', 'Zero external tuning cap needed'],
    limitations: ['High insulation requirements', 'Higher copper resistance per turn'],
    color: '#ffb547', references: ['wiki-tesla', 'hyper'],
    partsList: ['AWG 18 Magnet Wire (2 parallel strands)', 'Acrylic former disc 120 mm ID', 'High-voltage enamel insulation', 'Central copper terminal lugs'],
    assemblyGuide: 'Wind two strands simultaneously from center outward. Connect the end of strand A to the start of strand B in series.',
    sourcingGuide: 'Custom magnet wire winders, electronics lab suppliers, DIY Tesla coil builders.'
  },
  {
    id: 'halbach-array', name: 'Linear Halbach Array', family: 'Halbach Array', tag: 'FLUX CONCENTRATOR', shape: 'block',
    material: 'Sintered N52 NdFeB blocks with spatially rotating magnetization vector', composition: 'Nd ~30 wt%, Fe ~66 wt%, B ~1 wt%',
    dimensions: { length: 80, width: 25, height: 12, display: '80 x 25 x 12 mm 5-block linear Halbach array' }, thickness: 12, grade: 'N52 Halbach',
    br: [1.45, 1.52], coercivity: [880, 980], energy: [410, 440], maxTemp: 80, curie: 310, density: 7.5,
    strength: 'Concentrates flux almost entirely on one working face while cancelling field on the opposite face.',
    description: 'A 90-degree spatial rotation of magnetic vectors boosts field on one side while suppressing it to near-zero on the opposite side.',
    applications: ['Linear motor tracks', 'Maglev EDS guidance', 'Synchrotron undulators/wigglers'],
    advantages: ['One-sided flux concentration', 'Near-zero stray field on back side'],
    limitations: ['Complex multi-block assembly', 'High internal assembly forces'],
    color: '#35e6ff', references: ['arnold', 'mmpa'],
    partsList: ['5x N52 Neodymium Cubes', 'Aluminum alignment track', 'Cyanoacrylate bonding agent'],
    assemblyGuide: 'Clamp each block securely in a vice when rotating magnetization vectors by 90 degrees.',
    sourcingGuide: 'K&J Magnetics, Supermagnetman, Custom Halbach Fabricators'
  },
  {
    id: 'ybco-pellet', name: 'YBCO High-Tc Superconducting Pellet', family: 'Superconducting', tag: 'HTS PELLET', shape: 'disc',
    material: 'Yttrium Barium Copper Oxide (YBa2Cu3O7-x)', composition: 'Y ~13 wt%, Ba ~41 wt%, Cu ~28 wt%, O ~18 wt%',
    dimensions: { diameter: 30, height: 10, display: '30 mm diameter x 10 mm pellet' }, thickness: 10, grade: 'Single-grain YBCO',
    br: null, coercivity: null, energy: null, maxTemp: -180, curie: null, density: 6.3,
    strength: 'Traps flux lines via Quantum Flux Pinning below 93 K (-180 °C, liquid nitrogen temperature), producing 3D levitation.',
    description: 'YBCO is a high-temperature superconductor that operates above liquid nitrogen boiling point (77 K). When cooled below 93 K in a magnetic field, quantized flux tubes lock the pellet in 3D space.',
    applications: ['Quantum levitation tracks', 'Flywheel energy storage', 'Superconducting fault limiters'],
    advantages: ['Operates at liquid nitrogen temperature (77 K)', 'Quantum flux pinning gives 3D trapping'],
    limitations: ['Brittle ceramic oxide', 'Requires continuous LN2 cooling'],
    color: '#d96bff', references: ['wiki-super', 'hyper'],
    partsList: ['Single-Grain YBCO Pellet', 'Liquid Nitrogen Styrofoam Cryo Dewar', 'Plastic Tongs'],
    assemblyGuide: 'Pour liquid nitrogen into dewar until boiling subsides (-196 °C). Lower YBCO pellet onto magnet track.',
    sourcingGuide: 'QuantumLevitation.com, Educational Physics Cryo Suppliers, Can Superconductors Inc.'
  }
];

export const MATERIALS = [
  { id: 'iron', name: 'Iron (pure / ARMCO)', category: 'ferromagnetic', composition: 'Fe >= 99.8 wt%', density: [7.85, 7.88], hardness: '80-150 HB', conductivity: [9.9, 10.3], magnetic: { behavior: 'Strongly ferromagnetic; attracted to magnets', relativePermeability: '200-200000', explanation: 'Body-centred cubic alpha-iron has aligned domains below 770 C.' }, corrosion: 'Poor', applications: ['Cores', 'Electromagnets'], advantages: ['High permeability', 'High saturation (~2.15 T)'], disadvantages: ['Corrodes', 'Eddy loss'], color: '#b8c4d0', references: ['matweb'], partsList: ['ARMCO Soft Iron Plate'], assemblyGuide: 'Anneal in hydrogen atmosphere at 850 °C for maximum permeability.', sourcingGuide: 'ARMCO Metals, McMaster' },
  { id: 'mu-metal', name: 'Mu-Metal (Ni77Fe16Cu5Mo2)', category: 'ferromagnetic', composition: 'Ni ~77 wt%, Fe ~16 wt%, Cu ~5 wt%, Mo ~2 wt%', density: [8.70, 8.80], hardness: '120 HB', conductivity: [1.6, 1.8], magnetic: { behavior: 'Ultra-high relative permeability mu_r > 80,000', relativePermeability: 'Initial 20,000 - 100,000; max > 300,000', explanation: 'Mu-Metal absorbs low-frequency magnetic flux like a sponge, diverting stray fields around sensitive electronics.' }, corrosion: 'Good', applications: ['CRT shielding', 'MRI room liners', 'Audio transformers'], advantages: ['World-class magnetic shielding', 'Extreme permeability'], disadvantages: ['Saturates at 0.7 T', 'Requires hydrogen annealing after bend'], color: '#35e6ff', references: ['wiki-shield'], partsList: ['Mu-Metal Shielding Sheet 1.0 mm'], assemblyGuide: 'Do not drop or shock sheet after final hydrogen anneal.', sourcingGuide: 'Magnetic Shield Corp, MuShield Co.' },
  { id: 'copper', name: 'Copper (C11000)', category: 'nonferromagnetic', composition: 'Cu >= 99.90 wt%', density: [8.90, 8.96], hardness: '40-100 HB', conductivity: [58.0, 59.6], magnetic: { behavior: 'Diamagnetic; induces strong eddy braking in changing fields', relativePermeability: '~0.999994', explanation: 'Copper is weakly diamagnetic. Moving a magnet near copper induces eddy currents that oppose motion (Lenz Law).' }, corrosion: 'Excellent', applications: ['Coil Windings', 'Busbars', 'Eddy Brakes'], advantages: ['Highest practical conductivity'], disadvantages: ['Heavy', 'Not ferromagnetic'], color: '#c9784a', references: ['copper'], partsList: ['C11000 High-Purity Copper Plate/Fin'], assemblyGuide: 'Clean surface oxide with mild acid etch for maximum conductivity.', sourcingGuide: 'OnlineMetals, Copper Development Assoc' },
  { id: 'bifilar-copper', name: 'Double-Insulated Bifilar Magnet Wire', category: 'nonferromagnetic', composition: 'Cu >= 99.99 wt% with Class H Polyimide Enamel Insulation', density: [8.92, 8.96], hardness: 'Soft Annealed', conductivity: [58.5, 59.5], magnetic: { behavior: 'Diamagnetic conductor for high-capacitance resonant windings', relativePermeability: '0.99999', explanation: 'Parallel dual-conductor copper magnet wire designed for winding Tesla bifilar pancake coils.' }, corrosion: 'High Enamel Resistance', applications: ['Tesla Pancake Coils', 'Resonant Inductors', 'HF Transformers'], advantages: ['High voltage insulation breakdown (> 3000 V)', 'Parallel precision winding'], disadvantages: ['Requires stripping both leads before soldering'], color: '#e07a38', references: ['wiki-tesla'], partsList: ['AWG 22 Dual-Strand Enamel Wire 100m spool'], assemblyGuide: 'Use thermal stripper or sandpaper on wire ends before soldering.', sourcingGuide: 'MWS Wire Industries, Remington Magnet Wire' }
];

export const DEVICES = [
  { id: 'solenoid', name: 'Solenoid', shape: 'solenoid', description: 'A long helical coil whose interior field is nearly uniform.', physics: 'Ampere law gives B = mu0*n*I inside an ideal long solenoid.', formula: 'B_ideal = mu0 * (N/L) * I', applications: ['Actuators', 'Valves', 'Inductors'], defaults: { voltage: 12, current: 1.5, turns: 300, core: 'air', length: 80, diameter: 25, gap: 2 }, specs: ['Uniform interior field', 'Air-core avoids saturation'], references: ['hyper'], partsList: ['AWG 22 Magnet Wire', 'Acrylic Tube 25 mm OD', 'DC Power Supply 12V 2A'], assemblyGuide: 'Wind wire neatly in tight adjacent layers along acrylic tube length.', sourcingGuide: 'Electronics supply stores, Amazon, Digikey' },
  { id: 'tesla-coil', name: 'Resonant Tesla Coil Transformer', shape: 'tesla-coil', description: 'A resonant air-core high-frequency transformer producing high RF voltage.', physics: 'Energy transfers resonantly between primary and secondary tuned LC circuits.', formula: 'f0 = 1 / (2*pi*sqrt(L*C))', applications: ['High-voltage demonstrations', 'Wireless power research'], defaults: { voltage: 24, current: 5, turns: 800, core: 'air', length: 120, diameter: 40, gap: 5, resonantFrequency: 250, qualityFactor: 40 }, specs: ['Resonant air-core transformer', 'Lethal RF voltage hazard in real hardware'], references: ['wiki-tesla'], partsList: ['Secondary Winding AWG 34 (800 turns)', 'Primary Winding AWG 10 Copper Tubing (4 turns)', 'Top Load Aluminum Toroid', 'Solid State Inverter / Spark Gap Driver'], assemblyGuide: 'Tune primary tap location until primary resonant frequency matches secondary f0.', sourcingGuide: 'Eastern Voltage Research, OneTesla, DIY High Voltage' },
  { id: 'bifilar-resonator', name: 'Nikola Tesla Bifilar Resonator Coil', shape: 'copper-coil', description: 'Flat pancake bifilar coil with integrated high capacitance for wireless power transmission.', physics: 'Adjacent turns carry high voltage difference, storing up to 100x higher internal capacitive energy E_c = 1/2*C*V^2.', formula: 'E_total = 1/2*L*I^2 + 1/2*C*V^2', applications: ['Wireless Energy Grids', 'Resonant Induction Tanks'], defaults: { voltage: 36, current: 3, turns: 120, core: 'air', length: 10, diameter: 120, gap: 2 }, specs: ['Self-resonant flat pancake geometry', 'High energy density'], references: ['wiki-tesla'], partsList: ['AWG 18 Dual-Strand Enamel Wire', '120 mm Acrylic Base Plate', 'High Voltage RF Driver'], assemblyGuide: 'Connect end of Strand 1 to start of Strand 2 in series. Drive with high-frequency sine wave.', sourcingGuide: 'Custom Tesla coil builders, Lab Surplus' },
  { id: 'mhd-thruster', name: 'Magneto-Hydrodynamic (MHD) Thruster', shape: 'solenoid', description: 'Electromagnetic fluid thruster driving conductive fluid/plasma using cross-field Lorentz force F = I*L x B.', physics: 'Direct electrical current passed through fluid in an axial magnetic field generates continuous Lorentz thrust without moving parts.', formula: 'F_thrust = I * L * B', applications: ['Submarine silent propulsion', 'Plasma space thrusters', 'Liquid metal pumps'], defaults: { voltage: 24, current: 8, turns: 1, core: 'air', length: 100, diameter: 30, gap: 5 }, specs: ['No moving mechanical parts', 'Direct electromagnetic fluid propulsion'], references: ['hyper'], partsList: ['Pair of Copper Electrodes', 'Channel Glass/Polycarbonate Tube', 'N52 Neodymium Field Magnets', 'Saltwater or Liquid Metal conductive fluid'], assemblyGuide: 'Position electrodes perpendicular to magnetic field lines along fluid channel.', sourcingGuide: 'DIY Plasma Lab, Scientific Supply' }
];

export const EXPERIMENTS = [
  { id: 'two-north', number: 1, title: 'What happens when two North poles meet?', question: 'Like poles repel — observe the field bowing outward.', setup: 'Two identical bar magnets are placed with north poles facing. Drag them closer or change the gap.', procedure: ['Set facing poles to N ↔ N (repulsion).', 'Reduce the gap slider and watch field lines between the magnets.', 'Drag magnet B in the viewport to move it laterally.', 'Compare the force estimate with the attraction case.'], explanation: 'Field lines cannot cross and must form closed loops. When two north poles face each other, their outward flux is compressed into the gap and diverted sideways, producing a repulsive force.', result: 'The magnets repel. Field lines bow outward between the facing poles.', formula: 'F ~ 3*mu0*m1*m2/(2*pi*r^4)', view: 'field', magnet: 'neodymium-bar', references: ['hyper', 'britannica'] }
];

export const ENCYCLOPEDIA = [
  { id: 'domains', title: 'Magnetic Domains', category: 'MICROSCOPIC', summary: 'Why ferromagnets have regions of aligned spins.', body: 'A ferromagnetic material is divided into domains: microscopic regions in which atomic magnetic moments are aligned by quantum-mechanical exchange interaction.', formula: 'M = sum(m_i)/V', references: ['wiki-domain'] }
];

export const CONCEPT_PROJECTS = [
  {
    id: 'concept-1',
    number: 1,
    title: 'Linear Halbach Array One-Sided Flux Concentrator',
    category: 'FIELDS & SHIELDING',
    summary: 'A 5-magnet spatially rotating array that doubles flux on the active face while cancelling stray fields on the back.',
    setup: 'Five N52 NdFeB blocks arranged with 90-degree rotating magnetization vectors.',
    route: 'field',
    magnet: 'halbach-array',
    params: { gap: 15, strength: 140, density: 32, polarity: 'attract', fieldLines: true, heatmap: true, filings: false, displayMode: 'solid' },
    physicsExplanation: 'Superposition of 90-degree rotated blocks generates a spatial field vector B = B0*(1 + e^(-k*z)). On the bottom face the vectors reinforce; on the top face they cancel out.',
    formula: 'B_working = B0 * (1 + exp(-k*d)); B_back ~= 0'
  },
  {
    id: 'concept-2',
    number: 2,
    title: 'Tesla Bifilar Resonant Pancake Coil Energy Tank',
    category: 'ENERGY & POWER',
    summary: 'Nikola Tesla US Patent #512,340 flat pancake coil storing 100x higher internal capacitive energy.',
    setup: 'Bifilar dual-strand spiral winding connected in series end-to-start.',
    route: 'electro',
    device: 'bifilar-resonator',
    deviceParams: { voltage: 36, current: 3, turns: 120, core: 'air', length: 10, diameter: 120, gap: 2 },
    params: { strength: 150, fieldLines: true, heatmap: true },
    physicsExplanation: 'Adjacent turns carry high potential difference V, storing immense inter-turn capacitive energy E_C = 1/2*C*V^2 in addition to magnetic inductive energy E_L = 1/2*L*I^2.',
    formula: 'E_total = 1/2*L*I^2 + 1/2*C*V^2; Tesla Patent US#512,340'
  },
  {
    id: 'concept-3',
    number: 3,
    title: 'Magneto-Hydrodynamic (MHD) Electromagnetic Thruster',
    category: 'PROPULSION & MOTORS',
    summary: 'Continuous fluid propulsion using cross-field Lorentz force F = I*L x B without mechanical impellers.',
    setup: 'Crossed magnetic and electric fields driving conductive fluid or plasma down a channel.',
    route: 'electro',
    device: 'mhd-thruster',
    deviceParams: { voltage: 24, current: 8, turns: 1, core: 'air', length: 100, diameter: 30, gap: 5 },
    params: { speed: 1.8, fieldLines: true, heatmap: true },
    physicsExplanation: 'Current I passing between electrodes through a perpendicular B field experiences Lorentz force F = I*L x B, pumping the fluid backward and propelling the vehicle forward.',
    formula: 'F_thrust = I * L * B; v_exit = sqrt(2 * Delta_P / rho)'
  },
  {
    id: 'concept-4',
    number: 4,
    title: 'Mega-Neodymium Block (8,500 N Pull Force Stage)',
    category: 'ADVANCED MATERIALS',
    summary: 'Heavy 7.5 kg N52 neodymium block generating over 8,500 N (~860 kgf) holding force.',
    setup: 'Industrial 200 x 100 x 50 mm N52 NdFeB block in open space.',
    route: 'field',
    magnet: 'mega-neodymium-block',
    params: { gap: 25, strength: 180, density: 40, fieldLines: true, heatmap: true },
    physicsExplanation: 'Large pole surface area combined with high remanence Br = 1.48 T projects an intense flux density B, producing Maxwell holding pressure F = B^2*A / (2*mu0) exceeding 8.5 kN.',
    formula: 'F_pull = B^2 * A / (2*mu0); P_Maxwell = B^2 / (2*mu0) = 870 kPa'
  }
];

export function getConceptCombination(id) {
  const num = Math.max(1, Math.min(10000, Math.floor(Number(id) || 1)));

  if (num <= CONCEPT_PROJECTS.length) {
    const c = CONCEPT_PROJECTS[num - 1];
    return {
      ...c,
      conceptId: num,
      params: { gap: 10, strength: 100, density: 24, fieldLines: true, heatmap: false, filings: false, displayMode: 'solid', ...c.params }
    };
  }

  const mIdx = (num - 1) % MAGNETS.length;
  const matIdx = Math.floor((num - 1) / MAGNETS.length) % MATERIALS.length;
  const devIdx = Math.floor((num - 1) / (MAGNETS.length * MATERIALS.length)) % DEVICES.length;

  const magnet = MAGNETS[mIdx];
  const material = MATERIALS[matIdx];
  const device = DEVICES[devIdx];

  const polarities = ['attract', 'repel'];
  const displayModes = ['solid', 'cross-section', 'exploded', 'wireframe'];
  const routes = ['field', 'electro', 'materials', 'alloy'];

  const polarity = polarities[(num * 3) % polarities.length];
  const displayMode = displayModes[(num * 7) % displayModes.length];
  const route = routes[(num * 11) % routes.length];

  const gap = 5 + ((num * 13) % 115);
  const strength = 20 + ((num * 17) % 180);
  const density = 12 + ((num * 19) % 36);
  const temp = -20 + ((num * 23) % 320);

  const title = `Concept Project #${num}: ${magnet.name} + ${material.name} (${device.name})`;
  const summary = `Procedural Physical Laboratory Permutation #${num}: Exploring interactions between ${magnet.name}, ${material.name} plate, and ${device.name} at ${temp} °C with a ${gap} mm gap.`;
  const setup = `Magnet: ${magnet.name} (${magnet.family}) | Material: ${material.name} (${material.category}) | Device: ${device.name}`;

  return {
    conceptId: num,
    number: num,
    title,
    category: num % 2 === 0 ? 'AUTOMATED LAB MATRIX' : 'PERMUTATION STUDY',
    summary,
    setup,
    route,
    magnet: magnet.id,
    material: material.id,
    device: device.id,
    params: {
      gap,
      strength,
      density,
      polarity,
      temperature: temp,
      displayMode,
      fieldLines: true,
      heatmap: num % 2 === 0,
      filings: num % 3 === 0
    },
    physicsExplanation: `Interaction study between ${magnet.name} (Br ~ ${magnet.br ? magnet.br[0] : 1.0} T) and ${material.name} (${material.magnetic?.behavior || 'specimen'}). Applied strength set to ${strength}%, gap ${gap} mm. ${device.physics}`,
    formula: `Configuration #${num} | B_est = ${magnet.br ? (magnet.br[0] * strength / 100).toFixed(2) : '1.0'} T | F_mag ~ B^2*A / (2*mu0)`
  };
}
