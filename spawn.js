/*
 * spawn.js
 * Handle spawning new creeps
 * By J. Stuart McMurray
 * Created 20160106
 * Last Modified 20160106
 */

/* spawnCreep spawns, in room r, a creep named n with body b, role t, and
 * optional memory m.  The type will be placed in the creep's memory's role
 * field.  It will overwrite anything in m. */
function spawnCreep(r, n, b, t, m) {
        var i; /* Index */

        var rid = r.id; /* Room ID */

        /* Make sure the caches are set up */
        if (undefined === Game.rcache) {
                Game.rcache = {};
        }
        if (undefined === Game.rcache[rid]) {
                Game.rcache[rid] = {};
        }
        if (undefined === Game.rcache[rid].spawnInUse) {
                Game.rcache[rid].spawnInUse = {};
        }

        /* Make sure we have a list of spawns */
        findSpawnsInRoom(r);

        /* Try to create the creep */
        for (i = 0; i < Game.rcache[rid].spawns.length; ++i) {
                /* Ignore spawns in the process of spawning */
                if (Game.rcache[rid].spawns[i].spawning) {
                        continue;
                }
                if (true === Game.rcache[rid].spawnInUse[
                        Game.rcache[rid].spawns[i].id
                ]) {
                        continue;
                }
                
                /* Creep's memory */
                if (undefined === m) {
                        m = {};
                }
                m.role = t;

                /* Try to make it */
                var ret = (Game.rcache[rid].spawns[i].createCreep(b, n, m));
                if (_.isString(ret)) {
                        Game.rcache[rid].spawnInUse[
                                Game.rcache[rid].spawns[i].id
                        ] = true;
                        return ret;
                }
                return ret;
        }

        return undefined;
}
