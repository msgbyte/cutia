import { Command } from "./base-command";

export class BatchCommand extends Command {
	constructor(private commands: Command[]) {
		super();
	}

	execute(): void {
		for (const command of this.commands) {
			command.execute();
		}
	}

	undo(): void {
		for (const command of [...this.commands].reverse()) {
			command.undo();
		}
	}

	redo(): void {
		for (const command of this.commands) {
			command.execute();
		}
	}
}
