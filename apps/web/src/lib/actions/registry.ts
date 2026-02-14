import type {
	TAction,
	TActionFunc,
	TActionWithArgs,
	TActionWithOptionalArgs,
	TActionArgsMap,
	TArgOfAction,
	TInvocationTrigger,
} from "./types";

type ActionHandler = (arg: unknown, trigger?: TInvocationTrigger) => void;
const boundActions: Partial<Record<TAction, ActionHandler[]>> = {};

export function bindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	const typedHandler = handler as ActionHandler;
	if (handlers) {
		handlers.push(typedHandler);
	} else {
		boundActions[action] = [typedHandler];
	}
}

export function unbindAction<A extends TAction>(
	action: A,
	handler: TActionFunc<A>,
) {
	const handlers = boundActions[action];
	if (!handlers) return;

	const typedHandler = handler as ActionHandler;
	boundActions[action] = handlers.filter((h) => h !== typedHandler);

	if (boundActions[action]?.length === 0) {
		delete boundActions[action];
	}
}

type InvokeActionFunc = {
	(
		action: TActionWithOptionalArgs,
		args?: undefined,
		trigger?: TInvocationTrigger,
	): void;
	<A extends TActionWithArgs>(
		action: A,
		args: TActionArgsMap[A],
		trigger?: TInvocationTrigger,
	): void;
};

export const invokeAction: InvokeActionFunc = <A extends TAction>(
	action: A,
	args?: TArgOfAction<A>,
	trigger?: TInvocationTrigger,
) => {
	boundActions[action]?.forEach((handler) => handler(args, trigger));
};
