// Modules
const fs = require("fs"); // in Node
const path = require("path"); // in Node
const chalk = require("chalk"); // 20.67KB (7.96KB zipped)
const AdmZip = require("adm-zip"); // 29.6KB (10.46KB zipped)
const bar = require("cli-progress"); // 32.68KB (10.06KB zipped)
const readline = require("readline"); // in Node
const superagent = require("superagent"); // 55.66KB (17.25KB zipped)
const { spawn } = require("child_process"); // in Node
var crypto = require("crypto");
//* Title Screen

const splash =
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
\n`) + ` Développé par ${chalk.hex("#5271FF")("ValentinKhmer")}\n`;

const rl = readline.createInterface(process.stdin, process.stdout);

(async function () {
	console.log(splash + chalk.bold(`\n Préparation de l'installation...`));
	const wait = async (ms) =>
		await new Promise((resolve) => setTimeout(resolve, ms ? ms : 1000));

	const api = (
		await superagent
			.get(`https://api.urancity.ml/client`)
			.set("User-Agent", "UranCityInstaller/1.1.0")
			.retry(10)
	).body;

	// Define paths
	const paths = {
		download: path.join(process.env.USERPROFILE, "downloads"), // folder
		urancity: path.join(process.env.APPDATA, ".urancity"), // folder
		urancityTemp: path.join(process.env.APPDATA, ".uranciy-save"), // folder
		forge: path.join(
			process.env.APPDATA,
			".minecraft",
			"versions",
			`${api.info.minecraft}-forge-${api.info.forge}`,
			`${api.info.minecraft}-forge-${api.info.forge}.jar` // file
		),
	};

	// Check if last version is installed
	try {
		if (
			(
				await superagent.get(
					"https://raw.githubusercontent.com/UranCity/Client/main/VERSION"
				)
			).text === fs.existsSync(path.join(paths.urancity, "VERSION"))
				? fs.readFileSync(path.join(paths.urancity, "VERSION"))
				: undefined
		)
			await error("Vous possédez déjà la dernière version du client !");
	} catch (err) {
		await error(err);
	}

		try {
		await new Promise((resolve) => {
			rl.question(
				`\n Confirmez-vous l'installation ? [Entrée]`,
				() => {
					resolve();
				}
			);
		});
	} catch (error) {
		await error(error);
	}

	const cliBar = new bar.SingleBar({
		format: ` Progression |${chalk.hex("#3FFEFE")("{bar}")}| {percentage}%`,
		stopOnComplete: true,
		clearOnComplete: false,
		cloneFiles: false,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: false,
		forceRedraw: true,
	});

	// if "confition" is true, then execute the "then" function
	const step = [
		{
			name: "Téléchargement des données de jeu",
			condition: true,
			run: async () =>
				await new Promise((resolve, reject) => {
					superagent
						.get(
							"https://github.com/UranCity/Client/archive/refs/heads/main.zip"
						)
						.on("progress", (state) => {
							cliBar.update(state.percent);
						})
						.on("error", (err) => {
							reject(err);
						})
						.pipe(
							fs.createWriteStream(
								path.join(paths.download, api.info.clientFilename)
							)
						)
						.on("finish", () => {
							resolve();
						});
				}),
		},
		{
			name: "Téléchargement de Forge",
			condition: !fs.existsSync(paths.forge),
			run: async () =>
				await new Promise((resolve, reject) => {
					superagent
						.get(
							`https://maven.minecraftforge.net/net/minecraftforge/forge/${api.info.minecraft}-${api.info.forge}/forge-${api.info.minecraft}-${api.info.forge}-installer.jar`
						)
						.on("progress", (state) => {
							cliBar.update(state.percent);
						})
						.on("error", (err) => {
							reject(err);
						})
						.pipe(
							fs.createWriteStream(
								path.join(
									paths.download,
									`forge-${api.info.minecraft}-${api.info.forge}-installer.jar`
								)
							)
						)
						.on("finish", () => {
							resolve();
						});
				}),
		},
		{
			name: "Sauvegarde des fichiers personnels",
			condition: fs.existsSync(paths.urancity),
			run: async () => {
				if (!fs.existsSync(paths.urancityTemp)) {
					fs.mkdir(paths.urancityTemp, async (err) => {
						if (err) return await error(err);
					});
				}

				for (let e = 0; e < api.save.length; e++) {
					if (fs.existsSync(path.join(paths.urancity, api.save[e]))) {
						fs.renameSync(
							path.join(paths.urancity, api.save[e]),
							path.join(paths.urancityTemp, api.save[e])
						);
					}
					cliBar.update(Math.round((e / api.save.length) * 100));
				}

				await wait();

				fs.rmdirSync(paths.urancity, { recursive: true, force: true });
			},
		},
		{
			name: "Extraction des fichiers",
			condition: true,
			run: async () => {
				const zip = new AdmZip(
					path.join(paths.download, api.info.clientFilename)
				);
				zip.extractAllTo(process.env.APPDATA);

				cliBar.update(95);
				await wait();

				fs.renameSync(
					path.join(process.env.APPDATA, "Client-main"),
					paths.urancity
				);
			},
		},
		{
			name: "Téléchargement des mods",
			condition: true,
			run: async () => {
				fs.mkdirSync(path.join(paths.urancity, "mods"));

				for (let m = 0; m < api.mods.length; m++) {
					const modId = [
						api.mods[m].versionId.slice(0, 4).replace(/^0+/, ""),
						api.mods[m].versionId.slice(-3).replace(/^0+/, ""),
					].join("/");

					await new Promise((resolve, reject) => {
						superagent
							.get(
								`https://media.forgecdn.net/files/${modId}/${api.mods[m].filename}.jar`
							)
							.on("progress", (state) => {
								cliBar.update(state.percent / 2);
							})
							.on("error", (err) => {
								reject(err);
							})
							.pipe(
								fs.createWriteStream(
									path.join(
										paths.urancity,
										"mods",
										`${api.mods[m].filename}.jar`
									)
								)
							)
							.on("finish", () => {
								resolve();
							});
					});

					const modHash = crypto
						.createHash("md5")
						.update(
							fs.readFileSync(
								path.join(paths.urancity, "mods", `${api.mods[m].filename}.jar`)
							)
						)
						.digest("hex");

					if (modHash !== api.mods[m].hash)
						return await error(
							`Le hash du mod ${api.mods[m].filename} est invalide.`
						);

					cliBar.update(Math.round((m / api.mods.length) * 100));
				}
			},
		},
		{
			name: "Téléchargement d'OptiFine",
			condition: true,
			run: async () => {
				const ofUrl = (
					await superagent.get(
						`https://optifine-dl-link.vercel.app/api?mc=${api.info.minecraft}&of=${api.info.optifine}`
					)
				).body.url;

				await new Promise((resolve, reject) => {
					superagent
						.get(ofUrl)
						.on("progress", (state) => {
							cliBar.update(Math.round((state.percent * 99) / 100));
						})
						.on("error", (err) => {
							reject(err);
						})
						.pipe(
							fs.createWriteStream(
								path.join(
									paths.urancity,
									"mods",
									`OptiFine_${api.info.minecraft}_HD_U_${api.info.optifine}.jar`
								)
							)
						)
						.on("finish", () => {
							resolve();
						});
				});

				const ofHash = crypto
					.createHash("md5")
					.update(
						fs.readFileSync(
							path.join(
								paths.urancity,
								"mods",
								`OptiFine_${api.info.minecraft}_HD_U_${api.info.optifine}.jar`
							)
						)
					)
					.digest("hex");
				if (ofHash !== "e0717ba6d1674af83036ebc479fc77b4")
					return await error(`Le hash d'OptiFine est invalide.`);
			},
		},
		{
			name: "Installation de Forge",
			condition: !fs.existsSync(paths.forge),
			run: async () => {
				while (fs.existsSync(paths.forge)) {
					await new Promise((resolve, reject) => {
						spawn(`java`, [
							"-jar",
							path.join(
								paths.download,
								`forge-${api.info.minecraft}-${api.info.forge}-installer.jar`
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
			},
		},
		{
			name: "Restauration des fichiers personnels",
			condition: fs.existsSync(paths.urancityTemp),
			run: async () => {
				fs.readdirSync(paths.urancityTemp).forEach((file) => {
					fs.renameSync(
						path.join(paths.urancityTemp, file),
						path.join(paths.urancity, file)
					);
				});
				fs.rmdirSync(paths.urancityTemp, { recursive: true, force: true });
			},
		},
		{
			name: "Installation du profile",
			condition: true,
			run: async () => {
				let existJson = false;

				[
					"launcher_profiles.json", // Launcher Mojang (old)
					"launcher_profiles_microsoft_store.json", // Launcher Microsoft (new)
				].forEach((jsonProfile) => {
					const theoreticalPath = path.join(
						process.env.APPDATA,
						".minecraft",
						jsonProfile
					);
					if (fs.existsSync(theoreticalPath)) {
						const data = JSON.parse(fs.readFileSync(theoreticalPath));
						const profileObj = api.profile;

						profileObj.gameDir = paths.urancity;
						data.profiles.urancity = profileObj;

						fs.writeFileSync(theoreticalPath, JSON.stringify(data, null, 2));
						existJson = true;
					}
				});

				if (!existJson)
					await error(
						" Aucun launcher reconnu...\n Merci de relancer le programme en ayant lancé Minecraft au moins 1 fois sur votre machine."
					);
			},
		},
		{
			name: "Supression des déchets",
			condition: fs.existsSync(
				path.join(paths.download, api.info.clientFilename)
			),
			run: async () => {
				fs.unlinkSync(path.join(paths.download, api.info.clientFilename));
			},
		},
	];

	for (let s = 0; s < step.length; s++) {
		if (step[s].condition) {
			console.log(splash + chalk.bold(`\n ${step[s].name}...`));
			cliBar.start(100, 0);
			try {
				await step[s].run();
			} catch (err) {
				await error(err);
			}
			await wait();
			cliBar.update(100);
			console.clear();
		}
	}

	rl.question(
		splash +
			`\n${chalk.green.bold(
				"Installation terminée !"
			)}\n Appuyez sur [Entrée] pour quitter l'installation... `,
		() => {
			process.exit();
		}
	);
})();

const error = async (err) =>
	await new Promise(async (resolve, reject) => {
		console.error(chalk.red.bold(`\n\n ${err}\n\n`));
		console.log(
			chalk.inverse(
				"Besoin d'aide ? https://github.com/UranCity/Installer/issues/new/choose"
			)
		);
		await rl.question(
			"Appuyez sur [Entrée] pour quitter l'installation...",
			() => {
				process.exit();
				resolve();
			}
		);
	});
