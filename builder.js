/*
 * builder.js
 * Builds things, or upgrades the controler
 * By J. Stuart McMurray
 * Created 20160106
 * Last Modified 20160108
 */

/* handleBuilder handles the builder named n in Room r. */
function handleBuilder(n, r) {
        /* Get or make the creep */
        if (undefined === Game.creeps[n]) {
                return makeBuilder(n, r);
        }

        /* If we're out of energy, get some from something */
        if (0 === Game.creeps[n].carry.energy) {
                return fillUpEnergy(Game.creeps[n]);
        }

        /* If we don't have a construction target, try to get one */
        if (undefined === Game.creeps[n].memory.targetID) {
                Game.creeps[n].memory.targetID =
                        findNearestConstructionSiteID(Game.creeps[n]);
                /* If there is none, upgrade the controller */
                if (undefined === Game.creeps[n].memory.targetID) {
                        return upgradeController(Game.creeps[n]);
                }
        }

        /* Try to get the construction site */
        var cs = Game.getObjectById(Game.creeps[n].memory.targetID);
        if (null === cs) {
                Game.creeps[n].memory.targetID = undefined;
        }

        /* Construct there */
        var ret = Game.creeps[n].build(cs);
        if (ERR_NOT_IN_RANGE === ret) {
                return move(Game.creeps[n], cs);
        }
        return ret;
}

/* makeBuilder makes a builder named n in Room r. */
function makeBuilder(n, r) {
        var ec = roomEnergyCapacity(r); /* Effective energy capacity */
        /* Assume at least 300 capacity */
        if (300 > ec || !roomHasType(r, "truck")) {
                ec = 300;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(4 * Math.floor(ec / 250));
        for (var i = 0; i < ba.length; i += 4) {
                ba[i]     = CARRY;
                ba[i + 1] = MOVE;
                ba[i + 2] = WORK;
                ba[i + 3] = MOVE;
        }

        return spawnCreep(r, n, ba, "builder");
}

/* fillUpEnergy fills up Creep c's energy tanks at the storage, if there is
 * one, or the nearest energy holder. */
function fillUpEnergy(c) {
        /* Don't fill up if there's not a truck and a harvester */
        if (!roomHasType(c.room, "truck") ||
            !roomHasType(c.room, "harvester")) {
                return undefined;
        }
        var h;
        /* Get the energy holder target */
        if (undefined === c.memory.fillTargetID) {
                /* Use the storage if we have one and it has energy. */
                if (undefined !== c.room.storage &&
                    0 !== c.room.storage.store.energy) {
                        c.memory.fillTargetID = c.room.storage.id;
                /* If we haven't a storage, use the closest spawn with energy
                 * in it. */
                } else {
                        h = c.pos.findClosestByPath(
                                FIND_MY_SPAWNS,
                                {filter: function(x) {
                                        return 0 !== x.energy;
                                }}
                        )
                        if (null === h) {
                                return undefined;
                        }
                        c.memory.fillTargetID = h.id;
                }
        }

        /* Get hold of the current holder object */
        h = Game.getObjectById(c.memory.fillTargetID);

        /* Try again next tick if the holder disappeared or if it has no
         * energy left. */
        if (null === h || !hasEnergy(h)) {
                c.memory.fillTargetID = undefined;
                return undefined;
        }

        /* If we're not in range, move to it */
        if (!c.pos.isNearTo(h)) {
                return move(c, h);
        }

        /* Try to collect some energy */
        c.memory.fillTargetID = undefined;
        return h.transferEnergy(c);
}

/* hasEnergy returns true if the energy holder h has energy */
function hasEnergy(h) {
        /* If we have energy/energyCapacity */
        if (undefined !== h.energy) {
                return 0 !== h.energy;
        }

        /* Storages, on the other hand, have different names for things */
        return 0 !== h.store.energy;
}

/* findNearestConstructionSiteID gets the ID of the nearest construction site
 * to Creep c. */
function findNearestConstructionSiteID(c) {
        var nc = c.pos.findClosestByPath(findRoomConstructionSites(c.room));
        if (null !== nc) {
                return nc.id;
        }
        return undefined;
}

/* upgradeController has Creep c upgrade its rooms controller */
function upgradeController(c) {
        /* Move to the controller if we're not there already */
        if (!c.pos.isNearTo(c.room.controller)) {
                return move(c, c.room.controller);
        }

        /* Try to upgrade */
        return c.upgradeController(c.room.controller);
}

/* TODO: Take from spawns or storage only */
