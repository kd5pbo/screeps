/*
 * main.js
 * Main screeps loop
 * By J. Stuart McMurray
 * Created 20150106
 * Last Modified 20150108
 */

/* Update list of room holders every this many ticks, for just in case */
var updateHolders = 1000;

var nBuild = {"W19S1": 7}; /* Number of builders per room */

module.exports.loop = function() {
        var rn; /* Room name */
        var ro; /* Room object */

        /* Each tick, iterate over rooms we own */
        for (rn in Game.rooms) {
                ro = Game.rooms[rn];
                /* Skip it if it's not mine */
                if (!ro.controller.my) {
                        consol.log("This isn't my controller in " + ro.name);
                        continue;
                }
                /* Move things about in each room */
                handleRoom(ro);
        }

        console.log("CPU used in tick " + Game.time + ": " +
                    Game.getUsedCpu());
};

/* handleRoom handles the creeps in a Room ro */
function handleRoom(ro) {

        /* Room memory object */
        if (undefined === ro.memory.sources) {
                /* Sources */
                ro.memory.sources = ro.find(FIND_SOURCES).map(function(x){
                        return x.id;
                });
        }

        /* Harvest energy */
        var i;  /* Index */
        for (i in ro.memory.sources) {
                handleSource(Game.getObjectById(ro.memory.sources[i]));
        }

        /* Stick the harvested energy some place */
        for (i = 0; i < ro.memory.sources.length; ++i) {
                handleTruck("t-" + ro.name + "-" + i, ro);
        }

        /* Use the harvested energy to build things */
        if (undefined === nBuild[ro.name]) {
                nBuild[ro.name] = 1;
        }
        for (i = 0; i < nBuild[ro.name]; ++i) {
                handleBuilder("b-" + ro.name + "-" + i, ro);
        }

        /* Handle all the towers in the room */
        var ts = ro.find(FIND_MY_STRUCTURES, {filter: function(x) {
                return STRUCTURE_TOWER === x.structureType;
        }});
        for (i = 0; i < ts.length; ++i) {
                handleTower(ts[i]);
        }
}

/* roomEnergyCapacity returns the energy capacity of the Room r, less the
 * spawns. */ 
function roomEnergyCapacity(r) {
        /* Known raw energy capacity, for cache invalidation */
        if ((r.energyCapacityAvailable === r.memory.rawecap) &&
            (undefined !== r.memory.ecap)) {
                return r.memory.ecap;
        }

        /* Raw energy capacity */
        var ec = r.energyCapacityAvailable;
        r.memory.rawecap = ec;
        /* Subtract the capacity from the spawns */
        var ss = r.find(FIND_MY_SPAWNS);
        for (var i = 0; i < ss.length; ++i) {
                ec -= ss[i].energyCapacity;
        }

        /* Save that as the effective energy capacity */
        r.memory.ecap = ec;
        return ec;
}

/* roomHasHarvester returns true if there's already creep of type (role) t in
 * Room r. */
function roomHasType(r, t) {
        /* Set up the cache if we haven't got it already */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        if (undefined === Game.rcache[r.id].haveType) {
                Game.rcache[r.id].haveType = {};
        }

        /* See if we know whether we have a harvester */
        if (undefined !== Game.rcache[r.id].haveType[t]) {
                return Game.rcache[r.id].haveType[t];
        }

        /* Get a list of harvesters in the room */
        var hs = r.find(FIND_MY_CREEPS, {filter: function(x) {
                return t === x.memory.role;
        }});

        /* Cache and return whether we have them */
        if (0 === hs.length) {
                Game.rcache[r.id].haveType[t] = false;
                return false;
        }

        Game.rcache[r.id].haveType[t] = true;
        return true;
}

/* roomDroppedEnergy returns a list of the dropped energy (Resource objects)
 * in the Room r. */
function findRoomDroppedEnergy(r) {
        /* Make the storage for the cache */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }

        /* Use the cached value */
        if (undefined !== Game.rcache[r.id].denergy) {
                return Game.rcache[r.id].denergy;
        }

        /* Find the energy in the room */
        Game.rcache[r.id].denergy = r.find(
                FIND_DROPPED_RESOURCES,
                {filter: function(x) {
                        return RESOURCE_ENERGY === x.resourceType;
                }}
        );

        return Game.rcache[r.id].denergy;
}

/* findRoomConstructionSites returns a (possibly cached) list of construction
 * sites in the Room r.*/
function findRoomConstructionSites(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Try to use the cached version */
        if (undefined !== Game.rcache[r.id].csites) {
                return Game.rcache[r.id].csites;
        }
        /* If we don't have it cached, make it */
        Game.rcache[r.id].csites = r.find(FIND_MY_CONSTRUCTION_SITES);
        return Game.rcache[r.id].csites;
}

/* Find bad guys in the Room r. */
function findEnemiesInRoom(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Try to use the cached version */
        if (undefined !== Game.rcache[r.id].hcreeps) {
                return Game.rcache[r.id].hcreeps;
        }
        /* If we don't have it cached, make it */
        Game.rcache[r.id].hcreeps = r.find(FIND_HOSTILE_CREEPS);
        return Game.rcache[r.id].hcreeps;
}

/* findBrokenInRoom finds an object of FIND_* f in Room r with fewer hit
 * points than it ought to have. */
function findBrokenInRoom(f, r) {
        /* If we don't have it cached, get a list of all the creeps and find
         * the one missing the most health */
        var cs = r.find(f, {filter: function(x) {
                       return x.hits < x.hitsMax;
        }});
        /* If there's no creeps, note it */
        if (0 === cs.length) {
                return undefined;
        }
        return cs[0];
}

/* findWoundedCreepInRoom finds a wounded creep in Room r. */
function findWoundedCreepInRoom(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Try to use the cached version */
        if (undefined !== Game.rcache[r.id].wcreep) {
                return Game.rcache[r.id].wcreep;
        }
        Game.rcache[r.id].wcreep = findBrokenInRoom(FIND_MY_CREEPS, r);
        return Game.rcache[r.id].wcreep;
}

/* findBrokenStructureInRoom finds one of our broken structures in Room r. */
function findMyBrokenStructureInRoom(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Try to use the cached version */
        if (undefined !== Game.rcache[r.id].mybstruct) {
                return Game.rcache[r.id].mybstruct;
        }
        Game.rcache[r.id].mybstruct = findBrokenInRoom(FIND_MY_STRUCTURES, r);
        return Game.rcache[r.id].mybstruct;
}

/* findABrokenStructureInRoom finds any broken structure in Room r */
function findABrokenStructureInRoom(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Try to use the cached version */
        if (undefined !== Game.rcache[r.id].abstruct) {
                return Game.rcache[r.id].abstruct;
        }
        Game.rcache[r.id].abstruct = findBrokenInRoom(FIND_STRUCTURES, r);
        return Game.rcache[r.id].abstruct;
}

/* Find structures of STRUCTURE_* type t in Room r */
function findStructuresOfTypeInRoom(t, r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        if (undefined === Game.rcache[r.id].structs) {
                Game.rcache[r.id].structs = {};
        }
        /* If we don't have a cached list, make one */
        if (undefined === Game.rcache[r.id].structs[t]) {
                Game.rcache[r.id].structs[t] = r.find(
                        FIND_MY_STRUCTURES,
                        {filter: function(x) {
                                return x.structureType === t;
                        }}
                );
        }
        /* If not, find, cache */
        return Game.rcache[r.id].structs[t];
}

/* findSpawnsInRoom finds all the spawns in Room r */
function findSpawnsInRoom(r) {
        /* Make sure we have storage */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[r.id]) {
                Game.rcache[r.id] = {};
        }
        /* Get a list of spawns, if we haven't got them */
        if (undefined === Game.rcache[r.id].spawns) {
                /* Find unspawning spawns */
                Game.rcache[r.id].spawns = r.find(FIND_MY_SPAWNS)
        }
        return Game.rcache[r.id].spawns;
}
