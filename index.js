const profile = require("./profile.json"),
	bar = require("cli-progress"),
	chalk = require("chalk"),
	path = require("path"),
	fs = require("fs"),
	unzipper = require("unzipper"),
	Downloader = require("nodejs-file-downloader"),
	mv = require("mv");

//* Title Screen
console.log(
	chalk.cyan(`\n\
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
// console.log(profiles);

(async function () {
	const downloadPath = path.join(process.env.USERPROFILE, "/downloads"),
		urancityPath = path.join(process.env.APPDATA, ".uranciy"),
		urancityTempPath = path.join(process.env.APPDATA, ".uranciy-save"),
		toSave = [
			// Folders
			"resourcepacks",
			"saves",
			"schematics",
			"screenshots",
			"shaderpacks",
			"XaeroWaypoints",

			// Files
			"options.txt",
			"optionsof.txt",
			"usercache.json",
			"usernamecache.json",
		],
		wait = () => new Promise((resolve) => setTimeout(resolve, 1000));

	const cliBar = new bar.SingleBar({
		format: " Progression |" + chalk.blue("{bar}") + "| {percentage}%",
		stopOnComplete: true,
		clearOnComplete: false,
		cloneFiles: false,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
	});

	console.log(" Téléchargement des fichiers...");

	cliBar.start(100, 0);

	let fileName = "";
	const download = new Downloader({
		url: "https://github.com/ZJONSSON/node-unzipper/archive/refs/heads/master.zip",
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

	console.log(
		chalk.red(
			`\n⚠ NE TOUCHER PAS AU FICHIER "${path.join(downloadPath, fileName)}" !`
		)
	);
	await wait();

	if (fs.existsSync(urancityPath)) {
		console.log("\n Sauvegarde des fichiers personnels...");

		cliBar.start(100, 0);
		try {
			fs.mkdir(urancityTempPath);

			for (let e = 0; e < toSave.length; e++) {
				mv(
					path.join(urancityPath, toSave[e]),
					path.join(urancityTempPath, toSave[e]),
					{ mkdirp: true },
					function (err) {
						return error(err);
					}
				);
				cliBar.update(Math.round((e / toSave.length) * 100));
			}
			fs.rmdir(urancityPath);
			cliBar.update(100);

			wait();
		} catch (err) {
			return error(err);
		}
	}

	console.log("\n Extraction des fichiers...");
	cliBar.start(100, 0);
	fs.createReadStream(path.join(downloadPath, fileName)).pipe(
		unzipper.Extract({
			path: /* urancityPath */ path.join(process.env.USERPROFILE, "Desktop"),
		})
	);
	cliBar.update(100);

	await wait();

	console.log("\n Renommage du dossier principal...");
	cliBar.start(100, 0);
	try {
		fs.renameSync(
			path.join(process.env.APPDATA, fileName.split(".")[0]),
			urancityPath
		);
	} catch (err) {
		error(err);
	}
	cliBar.update(100);

	await wait();

	if (fs.existsSync(urancityTempPath)) {
		console.log("\n Importation de la sauvegarde...");

		cliBar.start(100, 0);
		try {
			for (let a = 0; a < toSave.length; a++) {
				mv(
					path.join(urancityTempPath, toSave[a]),
					path.join(urancityPath, toSave[a]),
					{ mkdirp: true },
					function (err) {
						return error(err);
					}
				);
				cliBar.update(Math.round((a / toSave.length) * 100));
			}
			fs.rmdir(urancityTempPath);
			cliBar.update(100);
		} catch (err) {
			error(err);
		}
	}

	console.log("\n Installation du profile...");

	cliBar.start(100, 0);
	try {
		let existJson = false;
		const jsonFilesPath = [
			path.join(process.env.APPDATA, ".minecraft", "launcher_profiles.json"), // Launcher Mojang
			path.join(
				process.env.APPDATA,
				".minecraft",
				"launcher_profiles_microsoft_store.json"
			), // Launcher Microsoft
		];

		for (let y; y < jsonFilesPath.length; y++) {
			if (fs.existsSync(jsonFilesPath[y])) {
				const readder = fs.readFileSync(jsonFilesPath[y]);

				const jsonObj = JSON.parse(readder);

				Object.defineProperty(jsonObj.profiles, "urancity", {
					value: JSON.parse(profile),
				});

				fs.writeFileSync(jsonFilesPath[y], JSON.stringify(jsonObj));
				existJson = true;
			}
			cliBar.update((y / jsonFilesPath) * 100);
		}

		if (!existJson) error("Aucun launcher reconnu...");
		cliBar.update(100);
	} catch (err) {
		error(err);
	}

	setTimeout(function () {
		console.log(" ");
		process.exit();
	}, 10000);
})();

function error(err) {
	console.error(` \n ` + err);
	process.exit();
}
