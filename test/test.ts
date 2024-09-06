import { CLI, CLIWindow, CLIText, CLIChoiceBox } from "../src/cli.js";

const textbox = new CLIText("Choose one");
const cli: CLI = new CLI()
cli.add(new CLIWindow(
        'main',
        [
            textbox,
            new CLIChoiceBox(
                [["Yess", "Maybe"], ["Dunno", "No"]],
                (index) => {
                    switch (index?.toString()) {
                        case "0-0":
                            textbox.text = "You choose: Yess";
                            break;

                        case "0-1":
                            textbox.text = "You choose: Maybe";
                            break;

                        case "1-0":
                            textbox.text = "You choose: Dunno";
                            break;

                        case "1-1":
                            textbox.text = "You choose: No";
                            break;

                        default:
                            textbox.text = "Something went wrong";
                            break;
                    }
                    cli.render();
                }
            )
        ]
    )
);
cli.render();