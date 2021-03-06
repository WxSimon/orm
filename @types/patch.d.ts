/// <reference path="DMLDriver.d.ts" />

declare namespace FxOrmPatch {
    interface PatchedSyncfiedModelOrInstance {
        /**
         * @important
         * 
         * methods patchSyncfied by 'fib-orm'
         */
        countSync: Function;
        firstSync: Function;
        lastSync: Function;
        allSync: Function;
        whereSync: Function;
        findSync: Function;
        removeSync: Function;
        runSync: Function;
    }

    interface PatchedSyncfiedInstanceWithDbWriteOperation extends PatchedSyncfiedModelOrInstance {
        saveSync: Function;
        removeSync: Function;
        validateSync: Function;
        modelSync: Function;
    }

    interface PatchedSyncfiedInstanceWithAssociations {
        /**
         * generated by association, but you don't know what it is
         */
        /* getXxx: Function; */
        /* setXxx: Function; */
        /* removeXxx: Function; */

        /* findByXxx: Function; */
        [associationFunc: string]: Function;
    }

    type PatchedDMLDriver = FxOrmDMLDriver.DMLDriver;

    interface PatchedORMInstance {
        driver: FxOrmPatch.PatchedDMLDriver;
    }

    interface PatchedSyncfiedInstantce extends FxOrmPatch.PatchedSyncfiedInstanceWithDbWriteOperation, FxOrmPatch.PatchedSyncfiedInstanceWithAssociations {
    }
}