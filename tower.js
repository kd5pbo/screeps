/*
 * tower.js
 * Handles towers
 * By J. Stuart McMurray
 * Created 20160108
 * Last Modified 20160108
 */

var minTowerEnergy = 10; /* Minimum energy for a tower to be useful */

/* handleTower handles a Tower t */
function handleTower(t) {
        /* If the tower hasn't enough energy, give up */
        if (t.energy < minTowerEnergy) {
                return undefined;
        }

        /* Make sure there's memory for the tower */
        if (undefined === Memory.towers) {
                Memory.towers = {};
        }
        /* Make sure there's memory for this tower */
        if (undefined === Memory.towers[t.id]) {
                Memory.towers[t.id] = {};
        }

        /* Attack/heal/repair target */
        var tgt;

        /* If we have an attack target ID, attack it */
        if (undefined !== Memory.towers[t.id].attackID) {
                /* Try to get the saved target */
                tgt = Game.getObjectById(Memory.towers[t.id].attackID);
                if (null !== tgt) {
                        return t.attack(tgt);
                }
                /* If it doesn't exist any more, find another target */
                Memory.towers[t.id].attackID = undefined;
        }

        /* See if there's any bad guys in the room */
        tgt = t.pos.findClosestByRange(findEnemiesInRoom(t.room));
        /* If so, attack and save for next tick */
        if (null !== tgt) {
                Memory.towers[t.id] = tgt.id;
                return t.attack(tgt);
        }

        /* See if we've get anything of our own saved to fix */
        if (undefined !== Memory.towers[t.id].myRepairID) {
                /* Get the structure to heal */
                tgt = Game.getObjectById(Memory.towers[t.id].myRepairID);
                /* If it's still broke, fix it */
                if (undefined !== tgt && tgt.hits < tgt.hitsMax) {
                        return t.repair(tgt);
                }
                /* If not, note it and try something else */
                Memory.towers[t.id].myRepairID = undefined;
        }
        
        /* See if there's anything else we own to fix */
        tgt = findMyBrokenStructureInRoom(t.room);
        if (undefined !== tgt) {
                Memory.towers[t.id].myRepairID = tgt.id;
                return t.repair(tgt);
        }

        /* See if we've got anything saved to heal */
        if (undefined !== Memory.towers[t.id].healID) {
                /* Get the creep to heal */
                tgt = Game.getObjectById(Memory.towers[t.id].healID);
                if (undefined !== tgt && tgt.hits < tgt.hitsMax) {
                        return t.heal(tgt);
                }
                Memory.towers[t.id].healID = undefined;
        }

        /* See if there's anything that needs healing */
        tgt = findWoundedCreepInRoom(t.room);
        if (undefined !== tgt) {
                Memory.towers[t.id].healID = tgt.id;
                return t.heal(tgt);
        }

//        /* See if we've get anything of our own saved to fix */
//        if (undefined !== Memory.towers[t.id].aRepairID) {
//                /* Get the structure to heal */
//                tgt = Game.getObjectById(Memory.towers[t.id].aRepairID);
//                /* If it's still broke, fix it */
//                if (undefined !== tgt && tgt.hits < tgt.hitsMax) {
//                        return t.repair(tgt);
//                }
//                /* If not, note it and try something else */
//                Memory.towers[t.id].aRepairID = undefined;
//        }
//        
//        /* See if there's anything else we own to fix */
//        tgt = findABrokenStructureInRoom(t.room);
//        if (undefined !== tgt) {
//                Memory.towers[t.id].aRepairID = tgt.id;
//                return t.repair(tgt);
//        }

        return undefined;
}


