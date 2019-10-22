import util = require('util');

import * as QueryGrammers from '../../Base/Query/QueryGrammar';
import { arraify, preDestruct } from '../../Utils/array';
import {
  gnrWalkWhere,
  parseOperatorFunctionAsValue,
  mapConjunctionOpSymbolToText,
  normalizeInInput,
  normalizeWhereInput,
  gnrWalkJoinOn,
} from '../../Base/Query/onWalkConditions';
import { isOperatorFunction } from '../../Base/Query/Operator';
import { mapObjectToTupleList } from '../../Utils/object';

export function filterKnexBuilderBeforeQuery (
	builder: any,
	beforeQuery: Function | Function[],
	ctx?: any
) {
	if (Array.isArray(beforeQuery)) {
		beforeQuery.forEach(bQ => {
			builder = filterKnexBuilderBeforeQuery(builder, bQ, ctx)
		})

		return builder
	}

	if (typeof beforeQuery === 'function') {
		const kqbuilder = beforeQuery(builder, ctx)

		if (kqbuilder)
			builder = kqbuilder
	}

	return builder
}

const filterWhereToKnexActionsInternal = gnrWalkWhere<
  null,
  {
    bQList: FxOrmDML.BeforeQueryItem[]
  }
>({
  onNode: ({ scene, nodeFrame, walk_fn, walk_fn_context, input }) => {
    const dfltReturn = { isReturn: false, result: <any>null }
    const { bQList } = walk_fn_context

    switch (scene) {
      case 'inputAs:conjunctionAsAnd': {
        return dfltReturn
      }
      case 'walkJoinOn:opsymbol:conjunction': {
        const [pres, last] = preDestruct(mapObjectToTupleList((<any>input)[nodeFrame.symbol]))
        const op_name = mapConjunctionOpSymbolToText(nodeFrame.symbol)

        walk_fn(pres, { ...walk_fn_context, parent_conjunction_op: op_name })
        walk_fn(last, { ...walk_fn_context, parent_conjunction_op: op_name })

        return dfltReturn
      }
      case 'walkWhere:opfn:in':
      case 'walkWhere:opfn:between':
      case 'walkWhere:opfn:like':
      case 'walkWhere:opfn:comparator': {
        const cmpr_opfn_result = <FxOrmQueries.OperatorFunctionResult>nodeFrame.cmpr_opfn_result
        const field_name = nodeFrame.field_name

        if (field_name) {
          let fValue = cmpr_opfn_result.value
          if (isOperatorFunction(fValue)) fValue = parseOperatorFunctionAsValue(fValue)
          else
            switch (scene) {
              case 'walkWhere:opfn:in': fValue = normalizeInInput(fValue); break
              case 'walkWhere:opfn:between': fValue = normalizeWhereInput(fValue); break
            }

          switch (cmpr_opfn_result.func_ref) {
            case QueryGrammers.Qlfn.Operators.eq:
              bQList.push((builder) => { builder.where(field_name, '=', fValue) }); break
            case QueryGrammers.Qlfn.Operators.ne:
              bQList.push((builder) => { builder.whereNot(field_name, '=', fValue) }); break
            case QueryGrammers.Qlfn.Operators.gt:
              bQList.push((builder) => { builder.where(field_name, '>', fValue) }); break
            case QueryGrammers.Qlfn.Operators.gte:
              bQList.push((builder) => { builder.where(field_name, '>=', fValue) }); break
            case QueryGrammers.Qlfn.Operators.lt:
              bQList.push((builder) => { builder.where(field_name, '<', fValue) }); break
            case QueryGrammers.Qlfn.Operators.lte:
              bQList.push((builder) => { builder.where(field_name, '<=', fValue) }); break
            // case QueryGrammers.Qlfn.Operators.is:
            //   bQList.push((builder) => { builder.where(field_name, fValue) }); break
            // case QueryGrammers.Qlfn.Operators.not:
            //   bQList.push((builder) => { builder.whereNot(field_name, fValue) }); break
            case QueryGrammers.Qlfn.Operators.in:
              bQList.push((builder) => { builder.whereIn(field_name, fValue) }); break
            case QueryGrammers.Qlfn.Operators.notIn:
              bQList.push((builder) => { builder.whereNotIn(field_name, fValue) }); break
            case QueryGrammers.Qlfn.Operators.between:
              bQList.push((builder) => { builder.whereBetween(field_name, [fValue.lower, fValue.higher]) }); break
            case QueryGrammers.Qlfn.Operators.notBetween:
              bQList.push((builder) => { builder.whereNotBetween(field_name, [fValue.lower, fValue.higher]) }); break
            case QueryGrammers.Qlfn.Operators.like:
              bQList.push((builder) => { builder.where(field_name, 'like', fValue) }); break
            case QueryGrammers.Qlfn.Operators.notLike:
              bQList.push((builder) => { builder.whereNot(field_name, 'like', fValue) }); break
            case QueryGrammers.Qlfn.Operators.startsWith:
              bQList.push((builder) => { builder.where(field_name, 'like', `${fValue}%`) }); break
            case QueryGrammers.Qlfn.Operators.endsWith:
              bQList.push((builder) => { builder.where(field_name, 'like', `%${fValue}`) }); break
            case QueryGrammers.Qlfn.Operators.substring:
              bQList.push((builder) => { builder.where(field_name, 'like', `%${fValue}%`) }); break
            default:
              throw new Error(`[filterWhereToKnexActions::unsupported_scene]`)
          }
        }

        return dfltReturn
      }
      default:
        new Error(`[filterWhereToKnexActions::unsupported_scene]`)
    }
  }
})

export function filterWhereToKnexActions (
    opts: FxOrmTypeHelpers.SecondParameter<FxOrmDML.DMLDriver['find']>
) {
    if (!opts) return
    const { where = null } = opts || {}
    if (!where) return

    const bQList = (opts.beforeQuery ? arraify(opts.beforeQuery) : []).filter(x => typeof x === 'function')
    // const restWhere: {[k: string]: Exclude<any, symbol>} = {};

    filterWhereToKnexActionsInternal(where, {bQList});
    opts.beforeQuery = bQList
    opts.where = {}
}

export const filterJoinOnConditionToClauseBuilderActions = gnrWalkWhere<
  null,
  {
    source_collection: string,
    target_collection: string,
    jbuilder: FKnexNS.Knex.JoinClause
  }
>({
  onNode: ({ scene, nodeFrame, walk_fn, walk_fn_context, input }) => {
    const dfltReturn = { isReturn: false, result: <any>null }
    const { jbuilder, source_collection, target_collection } = walk_fn_context

    if (!jbuilder) throw new Error(`[filterJoinOnConditionToClauseBuilderActions] jbuilder required!`)
    if (!source_collection) throw new Error(`[filterJoinOnConditionToClauseBuilderActions] source_collection required!`)

    switch (scene) {
      case 'inputAs:conjunctionAsAnd': {
        return dfltReturn
      }
      case 'walkJoinOn:opsymbol:conjunction': {
        const [pres, last] = preDestruct(mapObjectToTupleList((<any>input)[nodeFrame.symbol]))
        const op_name = mapConjunctionOpSymbolToText(nodeFrame.symbol)

        walk_fn(pres, { ...walk_fn_context, parent_conjunction_op: op_name })
        walk_fn(last, { ...walk_fn_context, parent_conjunction_op: op_name })

        return dfltReturn
      }
      case 'walkWhere:opfn:in':
      case 'walkWhere:opfn:between':
      case 'walkWhere:opfn:comparator': {
        const cmpr_opfn_result = <FxOrmQueries.OperatorFunctionResult>nodeFrame.cmpr_opfn_result
        const field_name = nodeFrame.field_name

        if (field_name) {
          const sourceVarNode = `${source_collection}.${field_name}`

          let fValue = cmpr_opfn_result.value

          if (isOperatorFunction(fValue)) {
            fValue = parseOperatorFunctionAsValue(fValue)
            switch (cmpr_opfn_result.value.$wrapper) {
              case QueryGrammers.Qlfn.Others.refTableCol: fValue = `${fValue.table}.${fValue.column}`
                break
              case QueryGrammers.Qlfn.Operators.colref: fValue = `${target_collection}.${fValue}`
                break
              case QueryGrammers.Qlfn.Operators.between: fValue = parseOperatorFunctionAsValue(fValue)
                break
              case QueryGrammers.Qlfn.Operators.in: fValue = parseOperatorFunctionAsValue(fValue)
                break
              default:
                new Error('unsupport operator here!')
            }
          } else
            switch (scene) {
              case 'walkWhere:opfn:in': fValue = normalizeInInput(fValue)
                break
              case 'walkWhere:opfn:between': fValue = normalizeWhereInput(fValue)
                break
            }

          switch (cmpr_opfn_result.func_ref) {
            case QueryGrammers.Qlfn.Operators.eq:
              jbuilder.on(sourceVarNode, '=', fValue); break
            case QueryGrammers.Qlfn.Operators.ne:
              jbuilder.on(sourceVarNode, '<>', fValue); break
            case QueryGrammers.Qlfn.Operators.in:
              jbuilder.onIn(sourceVarNode, fValue); break
            case QueryGrammers.Qlfn.Operators.notIn:
              jbuilder.onNotIn(sourceVarNode, fValue); break
            case QueryGrammers.Qlfn.Operators.between:
              jbuilder.onBetween(sourceVarNode, [fValue.lower, fValue.higher]); break
            case QueryGrammers.Qlfn.Operators.notBetween:
              jbuilder.onNotBetween(sourceVarNode, [fValue.lower, fValue.higher]); break
            default:
              throw new Error(`[filterJoinOnConditionToClauseBuilderActions::unsupported_scene] (scene: ${scene}, op_name: ${cmpr_opfn_result.op_name})`)
          }
        }

        return dfltReturn
      }
      default:
        new Error(`[filterJoinOnConditionToClauseBuilderActions::unsupported_scene] (scene: ${scene})`)
    }
  }
})

const filterJoinsToKnexActionsInternal = gnrWalkJoinOn<
  null,
  {
    source_collection: string,
    bQList: FxOrmDML.BeforeQueryItem[],
  }
>({
  onJoinNode: ({ scene, nodeFrame, walk_fn, walk_fn_context, input }) => {
    const dfltReturn = { isReturn: false, result: <any>null }
    const { bQList, source_collection } = walk_fn_context

    switch (scene) {
      case 'inputIs:joinList': {
        return dfltReturn
      }
      case 'inputIs:opfn:joinVerb': {
        const condInput = input().value
        const target_collection = condInput.collection

        switch (input.$wrapper) {
          case QueryGrammers.Qlfn.Selects.join:
            bQList.push((builder) => { builder.join(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.leftJoin:
            bQList.push((builder) => { builder.leftJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.leftOuterJoin:
            bQList.push((builder) => { builder.leftOuterJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.rightJoin:
            bQList.push((builder) => { builder.rightJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.rightOuterJoin:
            bQList.push((builder) => { builder.rightOuterJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.fullOuterJoin:
            bQList.push((builder) => { builder.fullOuterJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
          case QueryGrammers.Qlfn.Selects.innerJoin:
            bQList.push((builder) => { builder.innerJoin(target_collection, function () {
              filterJoinOnConditionToClauseBuilderActions(condInput.on, {jbuilder: this, source_collection, target_collection})
            }) }); break
        }
      }
      default:
        new Error(`[filterJoinsToKnexActionsInternal::unsupported_scene] `)
    }
  }
})

export function filterJoinSelectToKnexActions (
    opts: FxOrmTypeHelpers.SecondParameter<FxOrmDML.DMLDriver['find']>,
    source_collection: string
) {
    if (!opts) return
    const { joins = null } = opts || {}
    if (!joins) return

    const bQList = (opts.beforeQuery ? arraify(opts.beforeQuery) : []).filter(x => typeof x === 'function')

    filterJoinsToKnexActionsInternal(joins, {source_collection, bQList});
    opts.beforeQuery = bQList
    delete opts.joins

    return
}

export function filterResultAfterQuery (
	result: any,
	afterQuery: Function
) {
	if (typeof afterQuery === 'function') {
		result = afterQuery(result)
	}

	return result
}
