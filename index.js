// Modules
const fs = require("fs"); // in Node
const path = require("path"); // in Node
const chalk = require("chalk"); // 20.67KB (7.96KB zipped)
const AdmZip = require("adm-zip"); // 29.6KB (10.46KB zipped)
const bar = require("cli-progress"); // 32.68KB (10.06KB zipped)
const readline = require("readline"); // in Node
const superagent = require("superagent"); // 55.66KB (17.25KB zipped)
const { spawn } = require("child_process"); // No calculed

// Local data
const toSave = require("./save.json");
const profile = require("./profile.json");

//* Title Screen
console.log(
	chalk.hex("#3FFEFE")(`\n\
       █████  █████                              █████████  ███  █████             \n\
      ░░███  ░░███                              ███░░░░░███░░░  ░░███              \n\
       ░███   ░███ ████████  ██████  ████████  ███     ░░░ ████ ███████  █████ ████\n\
       ░███   ░███░░███░░███░░░░░███░░███░░███░███        ░░███░░░███░  ░░███ ░███ \n\
       ░███   ░███ ░███ ░░░  ███████ ░███ ░███░███         ░███  ░███    ░███ ░███ \n\
       ░███   ░███ ░███     ███░░███ ░███ ░███░░███     ███░███  ░███ ███░███ ░███ \n\
       ░░████████  █████   ░░████████████ █████░░█████████ █████ ░░█████ ░░███████ \n\
        ░░░░░░░░  ░░░░░     ░░░░░░░░░░░░ ░░░░░  ░░░░░░░░░ ░░░░░   ░░░░░   ░░░░░███ \n\
                                                                          ███ ░███ \n\
                                                                         ░░██████  \n\
                                                                          ░░░░░░   \n\
\n`) + ` Développé par ${chalk.hex("#5271FF")("ValentinKhmer")}\n`
);

(async function () {
	console.log(chalk.bold(" Préparation de l'installation..."));

	const fml = {
		minecraft: "1.16.5",
		version: "36.2.20",
	};

	// Define paths
	const downloadPath = path.join(process.env.USERPROFILE, "downloads");
	const urancityPath = path.join(process.env.APPDATA, ".urancity");
	const urancityTempPath = path.join(process.env.APPDATA, ".uranciy-save");

	const rl = readline.createInterface(process.stdin, process.stdout);
	const wait = async (ms) =>
		await new Promise((resolve) => setTimeout(resolve, ms ? ms : 1000));

	// Check if last version is installed
	try {
		if (
			// Get the last version
			(
				await superagent.get(
					"https://raw.githubusercontent.com/UranCity/Client/main/VERSION"
				)
			).text ===
			// Get the current version
			(() => {
				if (fs.existsSync(path.join(urancityPath, "VERSION"))) {
					return fs.readFileSync(path.join(urancityPath, "VERSION"));
				}
				return null;
			})()
		) {
			error("Vous possédez déjà la dernière version du client !");
		}
	} catch (err) {
		error(err);
	}

	const size =
		Math.round(
			await superagent
				.get("https://api.github.com/repos/UranCity/Client")
				.set("User-Agent", "SuperAgent 6.1.0")
				.then((res) => res.body.size / 10)
		) / 100;

	try {
		await new Promise((resolve) => {
			rl.question(
				` Taille du client: ${size}MB` +
					`\n Espace nécessaire*: ~${size * 2}MB` +
					`\n Espace disponible: N/A` +
					chalk.italic(
						`\n\n *Espace nécessaire pendant l'installation et non occupé par le client !`
					) +
					`\n Continuer l'installation ? [Entrée]`,
				() => {
					resolve();
				}
			);
		});
	} catch (error) {
		error(error);
	}

	const cliBar = new bar.SingleBar({
		format: ` Progression |${chalk.hex("#3FFEFE")("{bar}")}| {percentage}%`,
		stopOnComplete: true,
		clearOnComplete: false,
		cloneFiles: false,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
		forceRedraw: true,
	});

	// Check if the correct forge version is installed
	let forge = true;
	if (
		!fs.existsSync(
			path.join(
				process.env.APPDATA,
				".minecraft",
				"versions",
				`${fml.minecraft}-forge-${fml.version}`,
				`${fml.minecraft}-forge-${fml.version}.jar`
			)
		)
	)
		forge = false;

	console.log(chalk.bold("\n Téléchargement des fichiers..."));
	cliBar.start(100, 0);

	const fileName = "UranCity_Client_main.zip";

	try {
		// TODO: Download client's zip file
		await new Promise((resolve, reject) => {
			superagent
				.get("https://github.com/UranCity/Client/archive/refs/heads/main.zip")
				.on("progress", (state) => {
					cliBar.update(forge ? state.percent : state.percent / 2);
				})
				.on("error", (err) => {
					reject(err);
				})
				.pipe(fs.createWriteStream(path.join(downloadPath, fileName)))
				.on("finish", () => {
					resolve();
				});
		});

		if (forge) {
			await wait();
			cliBar.update(50);

			await new Promise((resolve, reject) => {
				superagent
					.get(
						`https://maven.minecraftforge.net/net/minecraftforge/forge/${fml.minecraft}-${fml.version}/forge-${fml.minecraft}-${fml.version}-installer.jar`
					)
					.on("progress", (state) => {
						cliBar.update(50 + state.percent / 2);
					})
					.on("error", (err) => {
						reject(err);
					})
					.pipe(
						fs.createWriteStream(
							path.join(
								downloadPath,
								`forge-${fml.minecraft}-${fml.version}-installer.jar`
							)
						)
					)
					.on("finish", () => {
						resolve();
					});
			});
		}
	} catch (err) {
		error(err);
	}

	await wait();
	cliBar.update(100);

	// TODO: Save personals files

	if (fs.existsSync(urancityPath)) {
		console.log(chalk.bold("\n Sauvegarde des fichiers personnels..."));

		cliBar.start(100, 0);
		try {
			if (!fs.existsSync(urancityTempPath)) {
				fs.mkdir(urancityTempPath, (err) => {
					if (err) return error(err);
				});
			}

			for (let e = 0; e < toSave.length; e++) {
				if (fs.existsSync(path.join(urancityPath, toSave[e]))) {
					fs.renameSync(
						path.join(urancityPath, toSave[e]),
						path.join(urancityTempPath, toSave[e])
					);
				}
				cliBar.update(Math.round((e / toSave.length) * 100));
			}

			await wait();

			fs.rmdirSync(urancityPath, { recursive: true, force: true });
			cliBar.update(100);

			await wait();
		} catch (err) {
			return error(err);
		}
	}

	console.log(chalk.bold("\n Extraction des fichiers..."));
	cliBar.start(100, 0);

	const zip = AdmZip(path.join(downloadPath, fileName));
	zip.extractAllTo(process.env.APPDATA);

	cliBar.update(50);
	await wait();

	fs.renameSync(path.join(process.env.APPDATA, "Client-main"), urancityPath);

	cliBar.update(100);
	await wait();

	if (!forge) {
		try {
			console.log(chalk.bold("\n Installation de Forge..."));
			cliBar.start(100, 0);
			while (
				fs.existsSync(
					path.join(
						process.env.APPDATA,
						".minecraft",
						"versions",
						`${fml.minecraft}-forge-${fml.version}`,
						`${fml.minecraft}-forge-${fml.version}.jar`
					)
				)
			) {
				await new Promise((resolve, reject) => {
					spawn(`java`, [
						"-jar",
						path.join(
							downloadPath,
							`forge-${fml.minecraft}-${fml.version}-installer.jar`
						),
					])
						.on("error", (err) => {
							reject(err);
						})
						.on("close", () => {
							resolve();
						});
				});
			}
		} catch (err) {
			error(err);
		}
		cliBar.update(100);
		await wait();
	}

	if (fs.existsSync(urancityTempPath)) {
		console.log(chalk.bold("\n Importation de la sauvegarde..."));

		cliBar.start(100, 0);
		try {
			await fs.readdirSync(urancityTempPath).forEach((file) => {
				fs.renameSync(
					path.join(urancityTempPath, file),
					path.join(urancityPath, file)
				);
			});
			fs.rmdirSync(urancityTempPath, { recursive: true, force: true });
		} catch (err) {
			error(err);
		}
		cliBar.update(100);
	}

	console.log(chalk.bold("\n Installation du profile..."));
	cliBar.start(100, 0);

	try {
		let existJson = false;

		const jsonProfiles = [
			"launcher_profiles.json", // Launcher Mojang (old)
			"launcher_profiles_microsoft_store.json", // Launcher Microsoft (new)
		];

		jsonProfiles.forEach((jsonProfile) => {
			const theoreticalPath = path.join(
				process.env.APPDATA,
				".minecraft",
				jsonProfile
			);
			if (fs.existsSync(theoreticalPath)) {
				const data = JSON.parse(fs.readFileSync(theoreticalPath));
				const profileObj = profile;

				profileObj.gameDir = urancityPath;
				data.profiles.urancity = profileObj;

				fs.writeFileSync(theoreticalPath, JSON.stringify(data, null, 2));
				existJson = true;
			}
		});
		cliBar.update(100);

		if (!existJson)
			error(
				" Aucun launcher reconnu...\n Merci de relancer le programme en ayant lancé Minecraft au moins 1 fois sur votre machine."
			);
	} catch (err) {
		error(err);
	}

	console.log(chalk.bold("\n Supression des déchets..."));
	if (fs.existsSync(path.join(downloadPath, fileName))) {
		fs.unlinkSync(path.join(downloadPath, fileName));
	}

	rl.question(
		`\n ${chalk.green.bold(
			"Installation terminée !"
		)}\n Appuyez sur [Entrée] pour quitter l'installation...`,
		() => {
			process.exit();
		}
	);
})();

function error(err) {
	console.error(chalk.red.bold(`\n\n ${err}\n\n`));
	console.log(
		chalk.inverse(
			"Besoin d'aide ? https://github.com/UranCity/Installer/issues/new/choose"
		)
	);
	rl.question("Appuyez sur [Entrée] pour quitter l'installation...", () => {
		process.exit();
	});
}
