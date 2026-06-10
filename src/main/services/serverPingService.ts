import * as net from 'net'
import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { app } from 'electron'
import { getProfile } from './profileService'
import { getSettings } from './settingsService'

export interface ServerStatus {
  id: string
  name: string
  host: string
  port: number
  featured: boolean
  online: boolean
  favicon: string | null
  version: string | null
  playersOnline: number
  playersMax: number
  motd: string | null
  ping: number | null
}

const FEATURED_SERVERS: { id: string; name: string; host: string; port: number }[] = [
  { id: 'donutsmp',        name: 'DonutSMP',             host: 'donutsmp.net',                 port: 25565 },
  { id: 'hugosmp',         name: 'HugoSMP',              host: 'hugosmp.net',                  port: 25565 },
  { id: 'hypixel',         name: 'Hypixel',              host: 'mc.hypixel.net',               port: 25565 },
  { id: 'complexgaming',   name: 'Complex Gaming',       host: 'hub.mc-complex.com',           port: 25565 },
  { id: 'manacube',        name: 'ManaCube',             host: 'buzz.manacube.com',            port: 25565 },
  { id: 'blossomcraft',    name: 'BlossomCraft',         host: 'buzz.blossomcraft.org',        port: 25565 },
  { id: 'mysticmc',        name: 'MysticMC',             host: 'buzz.mysticmc.co',             port: 25565 },
  { id: 'smilemorecraft',  name: 'SmileMoreCraft',       host: 'buzz.smilemorecraft.com',      port: 25565 },
  { id: 'akumamc',         name: 'AkumaMC',              host: 'akumamc.net',                  port: 25565 },
  { id: 'gommehd',         name: 'GommeHD',              host: 'gommehd.net',                  port: 25565 },
  { id: 'griefergames',    name: 'GrieferGames',         host: 'griefergames.net',             port: 25565 },
  { id: '2b2t',            name: '2b2t',                 host: 'connect.2b2t.org',             port: 25565 },
  { id: 'wynncraft',       name: 'Wynncraft',            host: 'play.wynncraft.com',           port: 25565 },
  { id: 'minepiece',       name: 'MinePiece',            host: 'adventure.minepiece.com',      port: 25565 },
  { id: 'chunklock',       name: 'ChunkLock',            host: 'survival.chunklock.com',       port: 25565 },
  { id: 'mythria',         name: 'Mythria',              host: 'play.mythria.gg',              port: 25565 },
  { id: 'blockdrop',       name: 'BlockDrop Network',    host: 'playbd.games',                 port: 25565 },
  { id: 'opblocks',        name: 'OPBlocks',             host: 'play.opblocks.com',            port: 25565 },
  { id: 'purpleprison',    name: 'Purple Prison',        host: 'purpleprison.org',             port: 25565 },
  { id: 'extremecraft',    name: 'ExtremeCraft',         host: 'play.extremecraft.net',        port: 25565 },
  { id: 'cubecraft',       name: 'CubeCraft',            host: 'play.cubecraft.net',           port: 25565 },
  { id: 'pikanetwork',     name: 'PikaNetwork',          host: 'play.pika-network.net',        port: 25565 },
  { id: 'jartexnetwork',   name: 'JartexNetwork',        host: 'top.jartex.fun',               port: 25565 },
  { id: 'loka',            name: 'Loka',                 host: 'play.lokamc.com',              port: 25565 },
  { id: 'earthmc',         name: 'EarthMC',              host: 'play.earthmc.net',             port: 25565 },
  { id: 'herobrine',       name: 'Herobrine.org',        host: 'herobrine.org',                port: 25565 },
  { id: 'minemenclub',     name: 'Minemen Club',         host: 'minemen.club',                 port: 25565 },
  { id: 'vipermc',         name: 'ViperMC',              host: 'play.vipermc.net',             port: 25565 },
  { id: 'oneblockmc',      name: 'OneBlock MC',          host: 'play.oneblockmc.com',          port: 25565 },
  { id: 'loverfella',      name: 'LoverFella',           host: 'play.loverfella.com',          port: 25565 },
  { id: 'insanitycraft',   name: 'InsanityCraft',        host: 'play.insanitycraft.net',       port: 25565 },
  { id: 'advancius',       name: 'Advancius Network',    host: 'mc.advancius.net',             port: 25565 },
  { id: 'simplesurvival',  name: 'SimpleSurvival',       host: 'play.simplesurvival.gg',       port: 25565 },
  { id: 'mixelpixel',      name: 'MixelPixel',           host: 'mixelpixel.net',               port: 25565 },
  { id: 'landania',        name: 'Landania',             host: 'landania.net',                 port: 25565 },
  { id: 'opsucht',         name: 'Opsucht',              host: 'opsucht.net',                  port: 25565 },
  { id: 'twerion',         name: 'Twerion',              host: 'ms.twerion.net',               port: 25565 },
  { id: 'cubeside',        name: 'Cubeside',             host: 'cubeside.de',                  port: 25565 },
  { id: 'mcplayhd',        name: 'McPlayHD',             host: 'mcplayhd.net',                 port: 25565 },
  { id: 'hexagonmc',       name: 'HexagonMC',            host: 'hexagonmc.eu',                 port: 25565 },
  { id: 'lemoncloud',      name: 'LemonCloud',           host: 'play.lemoncloud.org',          port: 25565 },
  { id: 'originrealms',    name: 'Origin Realms',        host: 'play.originrealms.com',        port: 25565 },
  { id: 'wildercraft',     name: 'WilderCraft',          host: 'play.wildercraft.net',         port: 25565 },
  { id: 'vulengate',       name: 'Vulengate',            host: 'play.vulengate.com',           port: 25565 },
  { id: 'skyblocknet',     name: 'Skyblock Net',         host: 'skyblock.net',                 port: 25565 },
  { id: 'tulipsurvival',   name: 'TulipSurvival',        host: 'play.tulipsurvival.com',       port: 25565 },
  { id: 'datblock',        name: 'Datblock',             host: 'play.datblock.com',            port: 25565 },
  { id: 'potterworld',     name: 'Potterworld',          host: 'play.potterworldmc.com',       port: 25565 },
  { id: 'piratecraft',     name: 'PirateCraft',          host: 'mc.piratemc.com',              port: 25565 },
  { id: 'pokefind',        name: 'PokeFind',             host: 'play.pokefind.co',             port: 25565 },
  { id: 'stoneworks',      name: 'Stoneworks',           host: 'play.stoneworks.gg',           port: 25565 },
  { id: 'oplegends',       name: 'OPLegends',            host: 'play.oplegends.com',           port: 25565 },
  { id: 'fadecloud',       name: 'FadeCloud',            host: 'fadecloud.com',                port: 25565 },
  { id: 'craftyourtown',   name: 'CraftYourTown',        host: 'play.craftyourtown.com',       port: 25565 },
  { id: 'fruitservers',    name: 'FruitServers',         host: 'mc.fruitservers.net',          port: 25565 },
  { id: 'autocraft',       name: 'Autocraft',            host: 'play.autocraftmc.org',         port: 25565 },
  { id: 'suniverse',       name: 'Suniverse',            host: 'play.suniverse.or.id',         port: 25565 },
  { id: 'netherite',       name: 'Netherite',            host: 'play.netherite.gg',            port: 25565 },
  { id: 'medievallords',   name: 'Medieval Lords',       host: 'play.ml-mc.com',               port: 25565 },
  { id: 'skyblocksquad',   name: 'Skyblock Squad',       host: 'play.skyblocksquad.net',       port: 25565 },
  { id: 'cosmicsky',       name: 'Cosmic Sky',           host: 'play.cosmicsky.com',           port: 25565 },
  { id: 'destinymc',       name: 'DestinyMC',            host: 'play.thedestinymc.com',        port: 25565 },
  { id: 'supercraft',      name: 'SuperCraft',           host: 'play.supercraft.club',         port: 25565 },
  { id: 'minespire',       name: 'MineSpire',            host: 'play.minespire.net',           port: 25565 },
  { id: 'craftrise',       name: 'CraftRise',            host: 'play.craftrise.tc',            port: 25565 },
  { id: 'sonoyuncu',       name: 'Sonoyuncu',            host: 'play.sonoyuncu.network',       port: 25565 },
  { id: 'shadowverse',     name: 'Shadowverse',          host: 'play.shadowverse.net',         port: 25565 },
  { id: 'roxbot',          name: 'RoxBot',               host: 'play.roxbot.com',              port: 25565 },
  { id: 'mcprison',        name: 'MCPrison',             host: 'play.mcprison.com',            port: 25565 },
  { id: 'aerocraft',       name: 'AeroCraft',            host: 'play.aerocraft.net',           port: 25565 },
  { id: 'primemc',         name: 'PrimeMC',              host: 'play.primemc.org',             port: 25565 },
  { id: 'saiyancraft',     name: 'SaiyanCraft',          host: 'play.saiyancraft.net',         port: 25565 },
  { id: 'totalfreedom',    name: 'Total Freedom',        host: 'play.totalfreedom.me',         port: 25565 },
  { id: 'purityvanilla',   name: 'PurityVanilla',        host: 'purityvanilla.com',            port: 25565 },
  { id: 'vanillahigh',     name: 'Vanilla High',         host: 'vanillahigh.net',              port: 25565 },
  { id: 'simplyvanilla',   name: 'Simply Vanilla',       host: 'simplyvanilla.org',            port: 25565 },
  { id: 'auracraft',       name: 'AuraCraft',            host: 'play.auracraft.net',           port: 25565 },
  { id: 'titanmc',         name: 'TitanMC',              host: 'play.titanmc.net',             port: 25565 },
  { id: 'ultranetwork',    name: 'Ultra Network',        host: 'play.ultramc.net',             port: 25565 },
  { id: 'blazegaming',     name: 'BlazeGaming',          host: 'play.blazegaming.co',          port: 25565 },
  { id: 'pixelmontogo',    name: 'Pixelmon To Go',       host: 'play.pixelmontogo.com',        port: 25565 },
  { id: 'pokeplanet',      name: 'PokéPlanet',           host: 'play.pokeplanet.net',          port: 25565 },
  { id: 'journeygaming',   name: 'Journey Gaming',       host: 'play.journeygaming.com',       port: 25565 },
  { id: 'roverssmp',       name: 'Rovers SMP',           host: 'play.roverssmp.com',           port: 25565 },
  { id: 'peacecraft',      name: 'Peace Craft',          host: 'play.peacecraft.net',          port: 25565 },
  { id: 'harmonysmp',      name: 'Harmony SMP',          host: 'play.harmonysmp.net',          port: 25565 },
  { id: 'unitymc',         name: 'UnityMC',              host: 'play.unitymc.net',             port: 25565 },
  { id: 'townyclassic',    name: 'TownyClassic',         host: 'play.townyclassic.net',        port: 25565 },
  { id: 'aliquam',         name: 'Aliquam',              host: 'play.aliquam.org',             port: 25565 },
  { id: 'creativecentral', name: 'Creative Central',     host: 'play.creativecentral.net',     port: 25565 },
  { id: 'buildersrefuge',  name: 'Builders Refuge',      host: 'buildersrefuge.com',           port: 25565 },
  { id: 'pocketpixels',    name: 'PocketPixels',         host: 'play.pocketpixels.net',        port: 25565 },
  { id: 'miragecraft',     name: 'MirageCraft',          host: 'play.miragecraft.net',         port: 25565 },
  { id: 'pixelmongens',    name: 'Pixelmon Generations', host: 'play.pixelmongenerations.com', port: 25565 },
  { id: 'smashmc',         name: 'SmashMC',              host: 'play.smashmc.co',              port: 25565 },
  { id: 'hylex',           name: 'Hylex',                host: 'play.hylex.io',                port: 25565 },
  { id: 'bedwarsgames',    name: 'BedWars.games',        host: 'bedwars.games',                port: 25565 },
  { id: 'lunarnetwork',    name: 'Lunar Network',        host: 'lunar.gg',                     port: 25565 },
  { id: 'straynetwork',    name: 'Stray Network',        host: 'stray.gg',                     port: 25565 },
  { id: 'syblock',         name: 'Syblock',              host: 'play.syblock.net',             port: 25565 },
  { id: 'skyblockx',       name: 'SkyblockX',            host: 'play.skyblockx.net',           port: 25565 },
  { id: 'castia',          name: 'Castia',               host: 'play.castiamc.com',            port: 25565 },
  { id: 'phrenzy',         name: 'Phrenzy',              host: 'play.phrenzymc.net',           port: 25565 },
  { id: 'desteria',        name: 'Desteria',             host: 'pvp.desteria.com',             port: 25565 },
  { id: 'saicopvp',        name: 'SaicoPvP',             host: 'play.saicopvp.com',            port: 25565 },
  { id: 'originmc',        name: 'OriginMC',             host: 'play.originmc.org',            port: 25565 },
  { id: 'thearchon',       name: 'The Archon',           host: 'play.thearchon.net',           port: 25565 },
  { id: 'sbhub',           name: 'Sb-hub',               host: 'play.sb-hub.com',              port: 25565 },
  { id: 'foxcraft',        name: 'FoxCraft',             host: 'play.foxcraft.net',            port: 25565 },
  { id: 'minetexas',       name: 'MineTexas',            host: 'minetexas.com',                port: 25565 },
  { id: 'minr',            name: 'Minr',                 host: 'zero.minr.org',                port: 25565 },
  { id: 'jumpcraft',       name: 'JumpCraft',            host: 'play.jumpcraft.org',           port: 25565 },
  { id: 'parkourcraft',    name: 'ParkourCraft',         host: 'play.parkourcraft.com',        port: 25565 },
  { id: 'happyhg',         name: 'Happy-HG',             host: 'happy-hg.com',                 port: 25565 },
  { id: 'mcwars',          name: 'MC-Wars',              host: 'play.mc-wars.org',             port: 25565 },
  { id: 'minestrike',      name: 'MineStrike',           host: 'play.minestrike.com',          port: 25565 },
  { id: 'mcmagic',         name: 'McMagic',              host: 'mcmagic.us',                   port: 25565 },
  { id: 'palacenetwork',   name: 'Palace Network',       host: 'play.palacenetwork.net',       port: 25565 },
  { id: 'dwo',             name: 'DWO',                  host: 'play.doctorwhoonline.co.uk',   port: 25565 },
  { id: 'craftingforchrist',name:'Crafting For Christ',  host: 'play.craftingforchrist.net',   port: 25565 },
  { id: 'safecraft',       name: 'SafeCraft',            host: 'play.safecraft.org',           port: 25565 },
  { id: 'intercraftmc',    name: 'InterCraft',           host: 'play.intercraftmc.com',        port: 25565 },
  { id: 'blockverse',      name: 'BlockVerse',           host: 'play.blockverse.net',          port: 25565 },
  { id: 'neocraftmc',      name: 'NeoCraft',             host: 'play.neocraftmc.com',          port: 25565 },
  { id: 'starcraft',       name: 'StarCraft',            host: 'play.starcraft.net',           port: 25565 },
  { id: 'galaxynetwork',   name: 'Galaxy Network',       host: 'play.galaxynetwork.gg',        port: 25565 },
  { id: 'novasmp',         name: 'Nova SMP',             host: 'play.novasmp.com',             port: 25565 },
  { id: 'nebulamc',        name: 'Nebula MC',            host: 'play.nebulamc.net',            port: 25565 },
  { id: 'zenithsmp',       name: 'Zenith SMP',           host: 'play.zenithsmp.org',           port: 25565 },
  { id: 'apexsurvival',    name: 'Apex Survival',        host: 'play.apexsurvival.com',        port: 25565 },
  { id: 'titansurvival',   name: 'Titan Survival',       host: 'play.titansurvival.net',       port: 25565 },
  { id: 'mythiccraft',     name: 'Mythic Craft',         host: 'play.mythiccraft.org',         port: 25565 },
  { id: 'legendarymc',     name: 'Legendary MC',         host: 'play.legendarymc.net',         port: 25565 },
  { id: 'ancientworld',    name: 'Ancient World',        host: 'play.ancientworld.net',        port: 25565 },
  { id: 'kingdomcraft',    name: 'Kingdom Craft',        host: 'play.kingdomcraft.org',        port: 25565 },
  { id: 'empireminecraft', name: 'Empire Minecraft',     host: 'play.emc.gs',                  port: 25565 },
  { id: 'ecocitycraft',    name: 'EcoCityCraft',         host: 'play.ecocitycraft.com',        port: 25565 },
  { id: 'pottercraft',     name: 'Pottercraft',          host: 'play.pottercraft.net',         port: 25565 },
  { id: 'swconquest',      name: 'Star Wars Conquest',   host: 'play.swconquest.net',          port: 25565 },
  { id: 'minecraftonline', name: 'MineCraftOnline',      host: 'minecraftonline.com',          port: 25565 },
  { id: '9b9t',            name: '9b9t',                 host: '9b9t.org',                     port: 25565 },
  { id: 'constantiam',     name: 'Constantiam',          host: 'constantiam.net',              port: 25565 },
  { id: '8b8t',            name: '8b8t',                 host: '8b8t.me',                      port: 25565 },
  { id: '4b4t',            name: '4b4t',                 host: '4b4t.org',                     port: 25565 },
  { id: '1b1t',            name: '1b1t',                 host: '1b1t.org',                     port: 25565 },
  { id: 'oldschoolmc',     name: 'OldSchoolMinecraft',   host: 'oldschoolminecraft.com',       port: 25565 },
  { id: 'betacraft',       name: 'BetaCraft',            host: 'betacraft.uk',                 port: 25565 },
  { id: 'retrocraft',      name: 'RetroCraft',           host: 'play.retrocraft.net',          port: 25565 },
  { id: 'classiccraft',    name: 'ClassicCraft',         host: 'play.classiccraft.org',        port: 25565 },
  { id: 'alphaserver',     name: 'AlphaServer',          host: 'play.alphaserver.net',         port: 25565 },
  { id: 'nostalgiamc',     name: 'NostalgiaMC',          host: 'play.nostalgiamc.com',         port: 25565 },
  { id: 'vanillaanarchy',  name: 'Vanilla Anarchy',      host: 'vanillaanarchy.net',           port: 25565 },
  { id: 'pureanarchy',     name: 'Pure Anarchy',         host: 'pureanarchy.org',              port: 25565 },
  { id: 'trueanarchy',     name: 'True Anarchy',         host: 'trueanarchy.net',              port: 25565 },
  { id: 'darkanarchy',     name: 'Dark Anarchy',         host: 'darkanarchy.org',              port: 25565 },
  { id: 'chaosmc',         name: 'Chaos MC',             host: 'play.chaosmc.net',             port: 25565 },
  { id: 'riotnetwork',     name: 'Riot Network',         host: 'play.riotnetwork.com',         port: 25565 },
  { id: 'havocgames',      name: 'Havoc Games',          host: 'play.havocgames.net',          port: 25565 },
  { id: 'miningdead',      name: 'Mining Dead',          host: 'play.miningdead.com',          port: 25565 },
  { id: 'zombiesmp',       name: 'ZombieSMP',            host: 'play.zombiesmp.com',           port: 25565 },
  // Minehut-hosted
  { id: 'solarskies',      name: 'SolarSkies',           host: 'solarskies.minehut.gg',        port: 25565 },
  { id: 'runedmc',         name: 'RunedMC',              host: 'runedmc.minehut.gg',           port: 25565 },
  { id: 'unstablehq',      name: 'UnstableHQ',           host: 'unstablehq.minehut.gg',        port: 25565 },
  { id: 'alpmc',           name: 'AlpMc',                host: 'alpmc.minehut.gg',             port: 25565 },
  // mcsh.io community
  { id: 'medievalsmp',     name: 'MedievalSMP',          host: 'smpmedieval.mcsh.io',          port: 25565 },
  { id: 'viresmc',         name: 'ViresMC',              host: 'viresmc.mcsh.io',              port: 25565 },
  { id: 'astralmc',        name: 'AstralMC',             host: 'elementalsmp670.mcsh.io',      port: 25565 },
  { id: 'vanillashake',    name: 'VanillaShake+',        host: 'vanillashakeplus.mcsh.io',     port: 25565 },
  { id: 'vanitysmp',       name: 'VanitySMP',            host: 'vanitysmpv2.mcsh.io',          port: 25565 },
  { id: 'megasmp',         name: 'MegaSMP',              host: 'megasmp.mcsh.io',              port: 25565 },
  { id: 'cellsmp',         name: 'CellSmp',              host: 'cellsmp.mcsh.io',              port: 25565 },
  { id: 'netheritesmp',    name: 'NetheriteSMP',         host: 'netheritesmp368.mcsh.io',      port: 25565 },
  { id: 'macessmp',        name: 'MaceSmp',              host: 'macessmp.mcsh.io',             port: 25565 },
  { id: 'aspectsmp',       name: 'Aspect SMP',           host: 'aspectsmp.mcsh.io',            port: 25565 },
  { id: 'bigberrysmp',     name: 'BigberrySMP',          host: 'bigberrysmp.mcsh.io',          port: 25565 },
  { id: 'peacesbp',        name: 'PeaceSBP',             host: 'peacesbp497.mcsh.io',          port: 25565 },
  { id: 'atomffa',         name: 'Atom FFA',             host: 'atomffagg.mcsh.io',            port: 25565 },
  { id: 'amethystsmp',     name: 'Amethystsmp',          host: 'amethystsmp396.mcsh.io',       port: 25565 },
  { id: 'abyssrevenge',    name: 'AbyssRevenge',         host: 'tough.mcsh.io',                port: 25565 },
  { id: 'ritesmprec',      name: 'RiteSMPrec',           host: 'ritesmprec.mcsh.io',           port: 25565 },
  // German servers
  { id: 'meloncity',       name: 'MelonCity',            host: 'meloncity.de',                 port: 25565 },
  { id: 'mcspielplatz',    name: 'Minecraft-Spielplatz', host: 'mc.minecraft-spielplatz.net',  port: 25565 },
  { id: 'secretcraft',     name: 'SecretCraft',          host: 'mc.secretcraft.de',            port: 25565 },
  { id: 'rangemc',         name: 'RangeMC',              host: 'rangemc.net',                  port: 25565 },
  { id: 'kadcon',          name: 'Kadcon',               host: 'kadcon.de',                    port: 25565 },
  { id: 'minebench',       name: 'MineBench',            host: 'minebench.de',                 port: 25565 },
  { id: 'skyblockserver',  name: 'SkyBlock-Server',      host: 'skyblock-server.de',           port: 25565 },
  { id: 'blockminers',     name: 'Blockminers',          host: 'blockminers.de',               port: 25565 },
  { id: 'terraconia',      name: 'Terraconia',           host: 'terraconia.de',                port: 25565 },
  { id: 'minecaria',       name: 'Minecaria',            host: 'minecaria.de',                 port: 25565 },
  { id: 'freecraft',       name: 'FreeCraft',            host: 'freecraft.de',                 port: 25565 },
  { id: 'bausucht',        name: 'Bausucht',             host: 'bausucht.net',                 port: 25565 },
  { id: 'mycraft',         name: 'MyCraft',              host: 'mycraft.com',                  port: 25565 },
  { id: 'unitedmc',        name: 'UnitedMC',             host: 'unitedmc.de',                  port: 25565 },
  { id: 'crafttopia',      name: 'Crafttopia',           host: 'play.crafttopia.org',          port: 25565 },
  { id: 'minesuperior',    name: 'MineSuperior',         host: 'hub.minesuperior.com',         port: 25565 },
  { id: 'primeblocks',     name: 'PrimeBlocks',          host: 'primeblocks.net',              port: 25565 },
]

type CustomServer = { id: string; name: string; host: string; port: number }

function getServersFile(): string {
  return path.join(app.getPath('userData'), 'servers.json')
}

function loadCustomServers(): CustomServer[] {
  try {
    return JSON.parse(fs.readFileSync(getServersFile(), 'utf8')) as CustomServer[]
  } catch {
    return []
  }
}

function saveCustomServers(servers: CustomServer[]): void {
  fs.writeFileSync(getServersFile(), JSON.stringify(servers, null, 2), 'utf8')
}

// ── VarInt ────────────────────────────────────────────────────────────────────

function writeVarInt(n: number): Buffer {
  const bytes: number[] = []
  n = n >>> 0
  do {
    let b = n & 0x7f
    n >>>= 7
    if (n !== 0) b |= 0x80
    bytes.push(b)
  } while (n !== 0)
  return Buffer.from(bytes)
}

function readVarInt(buf: Buffer, offset: number): { value: number; size: number } {
  let value = 0, size = 0, b: number
  do {
    b = buf[offset + size]
    value |= (b & 0x7f) << (7 * size)
    size++
    if (size > 5) throw new Error('VarInt too long')
  } while (b & 0x80)
  return { value, size }
}

function mcStr(s: string): Buffer {
  const data = Buffer.from(s, 'utf8')
  return Buffer.concat([writeVarInt(data.length), data])
}

function mcPacket(id: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat([writeVarInt(id), ...parts])
  return Buffer.concat([writeVarInt(body.length), body])
}

// ── SLP Ping ──────────────────────────────────────────────────────────────────

export function pingServer(host: string, port: number): Promise<{
  favicon: string | null
  version: string | null
  playersOnline: number
  playersMax: number
  motd: string | null
  ping: number
}> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(5000)

    let buf = Buffer.alloc(0)
    let phase: 'status' | 'done' = 'status'
    let connectTime = 0

    const fail = (e: Error) => {
      if (phase === 'done') return
      phase = 'done'
      socket.destroy()
      reject(e)
    }

    const succeed = (json: Record<string, unknown>, pingMs: number) => {
      if (phase === 'done') return
      phase = 'done'
      socket.destroy()

      const j = json as {
        version?: { name?: string }
        players?: { online?: number; max?: number }
        description?: { text?: string } | string
        favicon?: string
      }
      const rawMotd = typeof j.description === 'string'
        ? j.description
        : (j.description as { text?: string } | undefined)?.text ?? null

      resolve({
        favicon:       j.favicon ?? null,
        version:       j.version?.name ?? null,
        playersOnline: j.players?.online ?? 0,
        playersMax:    j.players?.max ?? 0,
        motd:          rawMotd ? rawMotd.replace(/§./g, '') : null,
        ping:          pingMs,
      })
    }

    socket.on('timeout', () => fail(new Error('Timeout')))
    socket.on('error', fail)
    socket.on('close', () => fail(new Error('Connection closed')))

    socket.connect(port, host, () => {
      connectTime = Date.now()
      const portBuf = Buffer.alloc(2)
      portBuf.writeUInt16BE(port)
      socket.write(mcPacket(0x00,
        writeVarInt(765),   // 1.20.4 protocol version
        mcStr(host),
        portBuf,
        writeVarInt(1),     // next state: status
      ))
      socket.write(mcPacket(0x00))  // status request
    })

    socket.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])

      while (buf.length >= 1) {
        let lenResult: { value: number; size: number }
        try { lenResult = readVarInt(buf, 0) } catch { break }

        const totalLen = lenResult.size + lenResult.value
        if (buf.length < totalLen) break

        const pktData = buf.slice(lenResult.size, totalLen)
        buf = buf.slice(totalLen)

        let dPos = 0
        let idRes: { value: number; size: number }
        try { idRes = readVarInt(pktData, dPos) } catch { continue }
        dPos += idRes.size

        if (phase === 'status' && idRes.value === 0x00) {
          let sLen: { value: number; size: number }
          try { sLen = readVarInt(pktData, dPos) } catch { continue }
          dPos += sLen.size
          const jsonStr = pktData.slice(dPos, dPos + sLen.value).toString('utf8')
          let parsedJson: Record<string, unknown>
          try { parsedJson = JSON.parse(jsonStr) } catch { continue }
          // Resolve immediately on status — don't wait for pong (many servers skip it)
          succeed(parsedJson, Date.now() - connectTime)
        }
      }
    })
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

function offlineEntry(s: { id: string; name: string; host: string; port: number; featured: boolean }): ServerStatus {
  return { ...s, online: false, favicon: null, version: null, playersOnline: 0, playersMax: 0, motd: null, ping: null }
}

export function getStaticList(): ServerStatus[] {
  const custom = loadCustomServers()
  return [
    ...FEATURED_SERVERS.map(s => offlineEntry({ ...s, featured: true })),
    ...custom.map(s => offlineEntry({ ...s, featured: false })),
  ]
}

export function addServer(host: string, port: number, name: string): string {
  const custom = loadCustomServers()
  const id = `custom-${Date.now()}`
  custom.push({ id, name: name || host, host, port })
  saveCustomServers(custom)
  return id
}

export function removeServer(id: string): void {
  saveCustomServers(loadCustomServers().filter(s => s.id !== id))
}

// ── servers.dat NBT ───────────────────────────────────────────────────────────

const TAG_END = 0, TAG_BYTE = 1, TAG_STRING = 8, TAG_LIST = 9, TAG_COMPOUND = 10

function nbtStr16(s: string): Buffer {
  const utf8 = Buffer.from(s, 'utf8')
  const h = Buffer.alloc(2)
  h.writeUInt16BE(utf8.length)
  return Buffer.concat([h, utf8])
}

function nbtEntry(type: number, name: string, val: Buffer): Buffer {
  return Buffer.concat([Buffer.from([type]), nbtStr16(name), val])
}

function buildServersDat(servers: { name: string; ip: string; icon?: string }[]): Buffer {
  const entries = servers.map(s => {
    const fields = [
      nbtEntry(TAG_STRING, 'ip',   nbtStr16(s.ip)),
      nbtEntry(TAG_STRING, 'name', nbtStr16(s.name)),
    ]
    if (s.icon) fields.push(nbtEntry(TAG_STRING, 'icon', nbtStr16(s.icon)))
    fields.push(nbtEntry(TAG_BYTE, 'hideAddress', Buffer.from([0])))
    fields.push(nbtEntry(TAG_BYTE, 'acceptTexturePackStatus', Buffer.from([0])))
    fields.push(Buffer.from([TAG_END]))
    return Buffer.concat(fields)
  })

  const listHdr = Buffer.alloc(5)
  listHdr.writeUInt8(TAG_COMPOUND, 0)
  listHdr.writeInt32BE(servers.length, 1)

  const rootBody = Buffer.concat([
    nbtEntry(TAG_LIST, 'servers', Buffer.concat([listHdr, ...entries])),
    Buffer.from([TAG_END]),
  ])

  return zlib.gzipSync(Buffer.concat([
    Buffer.from([TAG_COMPOUND]),
    nbtStr16(''),
    rootBody,
  ]))
}

function skipNbtTag(raw: Buffer, pos: number, type: number): number {
  switch (type) {
    case 1: return pos + 1
    case 2: return pos + 2
    case 3: return pos + 4
    case 4: return pos + 8
    case 5: return pos + 4
    case 6: return pos + 8
    case 7: return pos + 4 + raw.readInt32BE(pos)
    case 8: return pos + 2 + raw.readUInt16BE(pos)
    case 9: {
      const et = raw[pos++]; const c = raw.readInt32BE(pos); pos += 4
      for (let i = 0; i < c; i++) pos = skipNbtTag(raw, pos, et)
      return pos
    }
    case 10: {
      while (pos < raw.length) {
        const t = raw[pos++]; if (t === 0) break
        const nl = raw.readUInt16BE(pos); pos += 2 + nl
        pos = skipNbtTag(raw, pos, t)
      }
      return pos
    }
    case 11: return pos + 4 + raw.readInt32BE(pos) * 4
    case 12: return pos + 4 + raw.readInt32BE(pos) * 8
    default: return pos
  }
}

function readServersDat(data: Buffer): { name: string; ip: string; icon?: string }[] {
  try {
    const raw = zlib.gunzipSync(data)
    let pos = 1
    const nameLen = raw.readUInt16BE(pos); pos += 2 + nameLen

    while (pos < raw.length) {
      const tagType = raw[pos++]
      if (tagType === TAG_END) break
      const tNameLen = raw.readUInt16BE(pos); pos += 2
      const tName = raw.slice(pos, pos + tNameLen).toString(); pos += tNameLen

      if (tagType === TAG_LIST && tName === 'servers') {
        const elemType = raw[pos++]
        const count = raw.readInt32BE(pos); pos += 4
        const result: { name: string; ip: string; icon?: string }[] = []
        if (elemType === TAG_COMPOUND) {
          for (let i = 0; i < count; i++) {
            const srv: Record<string, string> = {}
            while (pos < raw.length) {
              const ft = raw[pos++]; if (ft === TAG_END) break
              const fl = raw.readUInt16BE(pos); pos += 2
              const fn = raw.slice(pos, pos + fl).toString(); pos += fl
              if (ft === TAG_STRING) {
                const vl = raw.readUInt16BE(pos); pos += 2
                srv[fn] = raw.slice(pos, pos + vl).toString(); pos += vl
              } else if (ft === TAG_BYTE) { pos++ }
            }
            if (srv.ip) result.push({ name: srv.name ?? '', ip: srv.ip, icon: srv.icon })
          }
        }
        return result
      }
      pos = skipNbtTag(raw, pos, tagType)
    }
  } catch {}
  return []
}

export function addServerToProfile(
  host: string,
  port: number,
  name: string,
  favicon: string | null,
  profileId: string,
): void {
  const settings = getSettings()
  const profile = getProfile(profileId)
  const gameDir = profile?.gameDir || settings.game.defaultGameDir
  const datFile = path.join(gameDir, 'servers.dat')

  let existing: { name: string; ip: string; icon?: string }[] = []
  if (fs.existsSync(datFile)) {
    try { existing = readServersDat(fs.readFileSync(datFile)) } catch {}
  }

  const ip = port === 25565 ? host : `${host}:${port}`
  if (!existing.some(s => s.ip === ip)) {
    existing.push({ name, ip, icon: favicon ?? undefined })
    const dat = buildServersDat(existing)
    fs.mkdirSync(path.dirname(datFile), { recursive: true })
    fs.writeFileSync(datFile, dat)
  }
}
