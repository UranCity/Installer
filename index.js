const fs = require("fs"),
	path = require("path"),
	chalk = require("chalk"),
	request = require("request"),
	bar = require("cli-progress"),
	unzipper = require("unzipper"),
	readline = require("readline"),
	toSave = require("./save.json"),
	profile = require("./profile.json"),
	Downloader = require("nodejs-file-downloader");

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

const rl = readline.createInterface(process.stdin, process.stdout);

(async function () {
	console.log(chalk.bold(" Préparation de l'installation..."));

	const downloadPath = path.join(process.env.USERPROFILE, "/downloads"),
		urancityPath = path.join(process.env.APPDATA, ".urancity"),
		urancityTempPath = path.join(process.env.APPDATA, ".uranciy-save");

	//* Check if last version
	const lastVersion = request(
		{
			method: "GET",
			url: "https://raw.githubusercontent.com/UranCity/Client/main/VERSION",
		},
		function (error, response) {
			if (error) throw new Error(error);
			return response.body;
		}
	);

	async function currentVersion() {
		if (fs.existsSync(path.join(urancityPath, "VERSION"))) {
			return await fs.readFileSync(path.join(urancityPath, "VERSION"));
		} else return "";
	}

	if (lastVersion === currentVersion)
		return console.log(" Vous possédez déjà la dernière version du client !");

	//* Add a interlude between steps
	const wait = (ms) =>
		new Promise((resolve) => setTimeout(resolve, ms ? ms : 1000));

	const cliBar = new bar.SingleBar({
		format:
			" Progression |" + chalk.hex("#3FFEFE")("{bar}") + "| {percentage}%",
		stopOnComplete: true,
		clearOnComplete: false,
		cloneFiles: false,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
	});

	console.log(chalk.bold("\n Téléchargement des fichiers..."));
	cliBar.start(100, 0);

	//* Download client zip file
	let fileName = "";
	const download = new Downloader({
		url: "https://github.com/UranCity/Client/archive/refs/heads/main.zip",
		directory: downloadPath,
		onProgress: function (percentage) {
			cliBar.update(percentage);
		},
		cloneFiles: false,
		maxAttempts: 3,
		onError: function (err) {
			error(err);
		},
		onBeforeSave: (deducedName) => {
			fileName = deducedName;
		},
	});

	try {
		await download.download();
		cliBar.update(100);
	} catch (err) {
		error(err);
	}
	await wait();

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

			wait();
		} catch (err) {
			return error(err);
		}
	}

	console.log(chalk.bold("\n Extraction des fichiers..."));
	cliBar.start(100, 0);
	fs.createReadStream(path.join(downloadPath, fileName)).pipe(
		unzipper.Extract({
			path: process.env.APPDATA,
		})
	);

	cliBar.update(50);
	await wait();

	fs.renameSync(
		path.join(process.env.APPDATA, fileName.split(".")[0]),
		urancityPath
	);

	cliBar.update(100);
	await wait();

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
			cliBar.update(100);
		} catch (err) {
			error(err);
		}
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
				" Aucun launcher reconnu...\n Merci de relancer le programme en ayant lancé Minecraft au moins 1 fois."
			);
	} catch (err) {
		error(err);
	}

	rl.question(
		'\n Appuyez sur "Entrée" pour quitter l\'installation...',
		function () {
			process.exit();
		}
	);
})();

async function error(err) {
	await console.error(" \n " + err + "\n");
	rl.question(
		'Appuyez sur "Entrée" pour quitter l\'installation...',
		function () {
			process.exit();
		}
	);
}
