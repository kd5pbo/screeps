/*
 * truck.js
 * Handle trucks
 * By J. Stuart McMurray
 * Created 20160106
 * Last Modified 20160108
 */

var resourceResvMax = 100; /* Max of ticks a creep may reserve a resource */
var towerFullCap    = 20;  /* Amount of empty space a tower can have before
                            * it's considered empty. */ 

/* handleTruck handles the truck named n */
function handleTruck(n, r) {
        /* If the truck doesn't exist, make it */
        if (undefined === Game.creeps[n]) {
                if (roomHasType(r, "harvester")) {
                        return makeTruck(n, r);
                }
                return undefined;
        }

        /* If we're full or partially full but not near a source,
         * deposit energy */
        if ((Game.creeps[n].carry.energy >=
             Game.creeps[n].carryCapacity) ||
             (0 !== Game.creeps[n].carry.energy &&
              0 === Game.creeps[n].pos.findInRange(
                      FIND_SOURCES_ACTIVE,
                      2).length)) {
                return depositEnergy(Game.creeps[n]);
        }

        /* If we're not full, find energy lying about, or failing that,
         * deposit what we have. */
        var ret = pickupEnergy(Game.creeps[n]);
        if (undefined === ret && 0 !== Game.creeps[n].carry.energy) {
                return depositEnergy(Game.creeps[n].carry.energy);
        }
        return ret;
}

/* makeTruck makes a truck named n in room r */
function makeTruck(n, r) {
        var ec = roomEnergyCapacity(r); /* Effective energy capacity */
        /* Assume at least 300 capacity */
        if (300 > ec || !roomHasType(r, "truck")) {
                ec = 300;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(2 * Math.floor(ec / 100));
        for (var i = 0; i < ba.length; i += 2) {
                ba[i]     = CARRY;
                ba[i + 1] = MOVE;
        }

        return spawnCreep(r, n, ba, "truck");
}

/* pickupEnergy causes Creep c to pick up energy in its room */
function pickupEnergy(c) {
        /* If we don't have cached energy, work out which to get. */
        if (undefined === c.memory.pickupTarget) {
                c.memory.pickupTarget = findBiggestEnergyId(c);
                if (undefined === c.memory.pickupTarget) {
                        return undefined;
                }
        }
        
        /* If we have cached energy, use that */
        var e = Game.getObjectById(c.memory.pickupTarget);
        /* Don't use it if it's not there */
        if (null === e) {
                c.memory.pickupTarget = findBiggestEnergyId(c);
                return undefined;
        }

        /* Lay claim to this one */
        console.log("Laying claim to " + e);
        markClaimed(e);

        /* If we're not near the target, move there */
        if (!c.pos.isNearTo(e)) {
                return move(c, e);
        }

        /* Retreive the energy */
        c.memory.pickupTarget = undefined;
        return c.pickup(e);
}

/* findBiggestEnergyId finds the ID of the biggest chunk of resource in Creep
 * c's room. */
function findBiggestEnergyId(c) {
        /* Make sure we know where the energy is */
        findRoomDroppedEnergy(c.room);

        /* Find the biggest amount of energy which isn't claimed. */
        var maxi; /* Index of resource with most energy */
        for (var i = 0; i < Game.rcache[c.room.id].denergy.length; ++i) {
                /* IF this one's claimed, move on */
                if (isClaimed(Game.rcache[c.room.id].denergy[i])) { 
                        console.log(Game.rcache[c.room.id].denergy[i] + " is already claimed.");
                        continue;
                }
                /* If we don't have a max, start with this one */
                if (undefined === maxi) {
                        maxi = i;
                }

                /* Note the index of the largest dropped energy */
                if (Game.rcache[c.room.id].denergy[i].amount >
                    Game.rcache[c.room.id].denergy[maxi].amount) {
                        maxi = i;
                }
        }

        /* If there's no (unclaimed) energy, return undefined */
        if (undefined === maxi) {
                return undefined;
        }

        /* Lay claim to that one, try to harvest or move towards it */
        return Game.rcache[c.room.id].denergy[maxi].id;
}

/* depositEnergy tells a Creep c to put energy in the nearest thing that has
 * sufficient space */
function depositEnergy(c) {
        var t;
        if (undefined === c.memory) {
                console.log("CM Undef, spawning: " + c.spawning);
        }
        /* If we don't have somewhere to put things, get the nearest non-full
         * energy holder. */
        if (undefined === c.memory.targetID) {
                /* Find the closest non-empty holder */
                t = findEnergyStorage(c);
                /* Give up if there's nothing */
                if (undefined === t) {
                        return undefined;
                }
                c.memory.targetID = t.id;
        }

        /* Get the target object */
        if (undefined === t) {
                t = Game.getObjectById(c.memory.targetID);
                if (null === t) {
                        return undefined;
                }
        }

        /* Try again if a cached holder runs out of space */
        if (!canHoldEnergy(t)) {
                t = findEnergyStorage(c);
                if (undefined === t) {
                c.memory.targetID = undefined;
                        return undefined;
                }
                c.memory.targetID = t.id;
        }

        /* If we're not near the target, move to it */
        if (!c.pos.isNearTo(t)) {
                return move(c, t);
        }

        /* Try to deposit energy in t */
        c.memory.targetID = undefined;
        return c.transfer(t, RESOURCE_ENERGY);
}

/* Make sure the target t has space for more energy */
function canHoldEnergy(t) {
        /* If it's a storage, that's easy */
        if (undefined !== t.storeCapacity) {
                return t.storeCapacity > t.store.energy;
        }

        /* Assume towers can hold 20 less than they really can */
        if (undefined !== t.structureType &&
            STRUCTURE_TOWER === t.structureType) {
                return (t.energyCapacity - towerFullCap) > t.energy;
        }
        /* If we have energy/energyCapacity */
        if (undefined !== t.energyCapacity) {
                /* Adjust for towers */
                return t.energyCapacity > t.energy;
        }
}

/* findEnergyStorage finds a place to put the energy held by Creep c */
function findEnergyStorage(c) {

        /* Prioritize the spawn and extensions. */

        var ss = _.filter(findSpawnsInRoom(c.room).concat(
                findStructuresOfTypeInRoom(STRUCTURE_EXTENSION, c.room)
        ), function (x) {
                return canHoldEnergy(x);
        })
        /* If we've not got anything, try towers */
        if (0 === ss.length) {
                /* Failing that, try a tower */
                ss = _.filter(findStructuresOfTypeInRoom(
                        STRUCTURE_TOWER,
                        c.room
                ), function (x) {
                        return canHoldEnergy(x);
                })
        }
        if (0 !== ss.length) {
                var s = c.pos.findClosestByPath(ss);
                if (null !== s) {
                        return s;
                }
        }
        /* Failing the towers stick it in the storage if we have one */
        if (undefined !== c.room.storage && canHoldEnergy(c.room.storage)) {
                return c.room.storage;
        }
        return undefined;
}
        
/* markClaimed marks Source s as being claimed */
function markClaimed(s) {
        /* Make sure we have storage */
        if (undefined === Game.claimed) {
                Game.claimed = {};
        }
        Game.claimed[s.id] = true;
}

/* isClaimed returns true if Source s is claimed */
function isClaimed(s) {
        console.log("Checking if " + s + " is claimed");
        /* If nothing's been claimed yet, this one's not */
        if (undefined === Game.claimed) {
                return false;
        }
        return true === Game.claimed[s.id];
}

