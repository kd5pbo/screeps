/*
 * tower.js
 * Handle a room's tower(s)
 * By J. Stuart McMurray
 * Created 20151223
 * Last Modified 20151223
 */

var minEn = 10; /* Minimum energy to do anything */
var repFrac = .9; /* Fraction at which buildings are repaired */

/* handleTowers handles a room's towers */
function handleTowers(r) {
        /* Get the room's towers */
        var ts = r.find(FIND_MY_STRUCTURES, {filter: function(x) {
                return STRUCTURE_TOWER === x.structureType;
        }});
        if (0 === ts.length) {
                return;
        }
        for (var i = 0; i < ts.length; ++i) {
                handleTower(ts[i]);
        }
}

/* handleTower handles a tower's action */
function handleTower(t) {
        /* Don't bother if we have no energy */
        if (minEn > t.energy) {
                return;
        }

        /* Try to attack */
        var h = t.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (null !== h) {
                return t.attack(h);
        }

        /* Try to heal */
        var m = t.room.find(FIND_MY_CREEPS, {filter: function(x){
                return x.hits < x.hitsMax;
        }});
        if (0 !== m.length) {
                return t.heal(m[0]);
        }

        /* Try to repair */
        var b = findBrokenBuilding(t);
        if (undefined !== b) {
                return t.repair(b);
        }
}

/* findBrokenBuilding finds a (possibly cached) building for tower t to
 * repair.  May return undefined on failure. */
function findBrokenBuilding(t) {
        /* Make sure we have memory for this tower */
        if (undefined === Memory[t.id]) {
                Memory[t.id] = {};
        }
        /* If we have a cached building that's not at 100%, fix that. */
        if (undefined !== Memory[t.id].toFixID) {
                /* Get the corresponding object */
                var b = Game.getObjectById(Memory[t.id].toFixID);
                /* If it doesn't exist, let the caller know */
                if (null === b) {
                        Memory[t.id].toFixID = undefined;
                        return undefined;
                }
                /* Return this bulding if it's still not fixed */
                if (b.hits < b.hitsMax) {
                        return b;
                }
        }
        /* Find the first unfixed building */
        var b = t.room.find(FIND_MY_STRUCTURES, {
                filter: function(x){
                        return x.hits < (x.hitsMax * repFrac);
                }
        });
        /* IF there's a building to be fixed, save it's ID, return its
         * object */
        if (0 !== b.length) {
                Memory[t.id].toFixID = b[0].id;
                return b[0];
        }

        /* Find roads */
        var rs = t.room.find(FIND_STRUCTURES, {filter: function(x) {
                return ((STRUCTURE_ROAD === x.structureType) ||
                        (STRUCTURE_WALL === x.structureType)) &&
                                (x.hits < (x.hitsMax * repFrac));
        }});
        if (0 != rs.length) {
                return rs[0];
        }
}

module.exports = handleTowers;
