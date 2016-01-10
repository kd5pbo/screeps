/*
 * source.js
 * Handles extraction from a source
 * By J. Stuart McMurray
 * Created 20160106
 * Last Modified 20160108  
 */

/* handleSource handles harvesting from a Source so */
function handleSource(so) {
        var sid = so.id; /* Source ID */

        /* Make sure we have memory */
        if (undefined === Memory[sid]) {
                Memory[sid] = {};
        }

        /* Get the harvester object */
        var c = getHarvesterFromSource(so);
        if (undefined === c) {
                return undefined;
        }

        /* If we're not near the source, get there */
        if (!c.pos.isNearTo(so)) {
                return move(c, so);
        }

        /* If the source has energy, harvest it */
        if (0 < so.energy) {
                return c.harvest(so);
        }

        return OK;
}

/* getHarvester returns a harvester object from a Source so, or tries to make
 * one and returns undefined. */
function getHarvesterFromSource(so) {
        var sid = so.id; /* Source ID */

        /* Make a harvester if we don't have one */
        var hn = Memory[sid].hn;
        if (undefined === hn) {
                Memory[sid].hn = makeHarvester(so);
                return undefined;
        }

        /* Get hold of the harvester */
        var c = Game.creeps[hn];
        if (undefined === c) {
                Memory[sid].hn = makeHarvester(so);
                return undefined;
        }

        return c;
}

/* makeHarvester makes a harvester for Source so */
function makeHarvester(so) {
        var ec = roomEnergyCapacity(so.room); /* Effective energy capacity */
        /* Assume at least 300 capacity */
        if (300 > ec ||
            !roomHasType(so.room, "harvester") ||
            !roomHasType(so.room, "truck")) {
                ec = 300;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(2 * Math.floor(ec / 150));
        for (var i = 0; i < ba.length; i += 2) {
                ba[i]     = WORK;
                ba[i + 1] = MOVE;
        }

        return spawnCreep(
                so.room,
                "h-" + so.room.name + "-" + so.pos.x + "," + so.pos.y, ba,
                "harvester");
}
