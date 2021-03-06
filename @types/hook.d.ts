/// <reference path="_common.d.ts" />
/// <reference path="instance.d.ts" />

declare namespace FxOrmHook {
    interface HookActionNextFunction<TTHIS = FxOrmInstance.Instance> {
        (this: TTHIS, err?: Error|null): any
    }

    interface HookActionCallback<TTHIS = FxOrmInstance.Instance, TPAYLOAD = any> {
        (this: TTHIS, next?: HookActionNextFunction): any
        (this: TTHIS, arg1?: TPAYLOAD, next?: HookActionNextFunction): any
    }

    interface HookResultCallback<TTHIS = FxOrmInstance.Instance, TPAYLOAD = any> {
        (this: TTHIS, success?: boolean): any
        (this: TTHIS, arg1?: TPAYLOAD, success?: boolean): any
    }

    interface HookTrigger<CTX_SELF = FxOrmInstance.Instance, RESULT_TYPE = boolean>{
        (self: CTX_SELF, cur: FxOrmNS.Arraible<HookResultCallback>, _?: RESULT_TYPE, ...args: any): void
    }

    interface HookWait<CTX_SELF = FxOrmInstance.Instance, TNEXT_THIS=any>{
        (self: CTX_SELF, cur: FxOrmNS.Arraible<HookActionCallback | FxOrmNS.Arraible<HookActionCallback>>, next: FxOrmNS.GenericCallback<TNEXT_THIS>, opts?: Fibjs.AnyObject): void
    }

    interface HookPatchOptions {
        /** 
         * @default false
         * 'prepend': prepend old oldhook to new hook
         * 'append': append old oldhook to new hook
         * undefined: overwrite oldhook
         */
        oldhook?: 'prepend' | 'append' | 'initial' | 'overwrite' | undefined
    }

    interface HookChannel<FTYPE = Function> {
        (name: string, handler: FTYPE): HookChannelResults
        (handler: FTYPE): HookChannelResults
        (name?: string): HookChannelResults
    }

    type HookTuple<FTYPE = Function> = [FTYPE, (fn: FTYPE, ...args: any) => any]

    interface HookChannelResults<FTYPE = Function> extends HookTuple<FTYPE> {
        run: (...args: any) => any
        set: (fn: Function, ...args: any) => any
    }
}
