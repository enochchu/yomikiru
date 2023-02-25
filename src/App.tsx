import "./MainImports";
import { createContext, createRef, ReactElement, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import Main from "./Components/Main";
import TopBar from "./Components/TopBar";
import { setAppSettings } from "./store/appSettings";
import { setUnzipping } from "./store/unzipping";
import { setLoadingManga } from "./store/isLoadingManga";
import { setLoadingMangaPercent } from "./store/loadingMangaPercent";
import { setLinkInReader } from "./store/linkInReader";
import { updateLastHistoryPage } from "./store/history";
import { setReaderOpen } from "./store/isReaderOpen";
import { setMangaInReader } from "./store/mangaInReader";
import { addBookmark } from "./store/bookmarks";
import { setTheme } from "./store/themes";

// window.logger.log("New window opening...");

// todo: why was i exporting this?
// export { themesMain };

interface IAppContext {
    pageNumberInputRef: React.RefObject<HTMLInputElement>;
    openInReader: (link: string, page?: number) => void;
    // addNewBookmark: (newBk: ChapterItem) => Promise<Electron.MessageBoxReturnValue> | undefined;
    closeReader: () => void;
    // updateLastHistoryPageNumber: () => void;
    openInNewWindow: (link: string) => void;
    checkValidFolder: (
        link: string,
        callback: (isValid?: boolean, imgs?: string[]) => void,
        sendImgs?: boolean
    ) => void;
    promptSetDefaultLocation: () => void;
}

export const AppContext = createContext<IAppContext>(null!);
const App = (): ReactElement => {
    const appSettings = useAppSelector((state) => state.appSettings);
    const isReaderOpen = useAppSelector((state) => state.isReaderOpen);
    const linkInReader = useAppSelector((state) => state.linkInReader);
    const bookmarks = useAppSelector((state) => state.bookmarks);
    const theme = useAppSelector((state) => state.theme.name);

    const pageNumberInputRef: React.RefObject<HTMLInputElement> = createRef();
    const [firstRendered, setFirstRendered] = useState(false);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (firstRendered) {
            if (appSettings.baseDir === "") {
                window.dialog.customError({ message: "No settings found, Select manga folder" });
                promptSetDefaultLocation();
            }
        } else {
            dispatch(setTheme(theme));
        }
    }, [firstRendered]);
    /**
     * Check if `{link}` has images or is in archive format(zip,cbz).
     * If link is a archive then extract it in temp dir and check for images.
     * @param link link of folder containing images or zip/cbz.
     * @param callback `{imgs}` array of full link of images.
     * @param sendImgs send full images links after done.
     */
    const checkValidFolder = (
        link: string,
        /**
         * `{imgs}` array of full link of images.
         */
        callback: (isValid?: boolean, imgs?: string[]) => void,
        sendImgs?: boolean
    ): void => {
        // ! changing imgs from name to link of image
        // let linkMain = link;
        const tempFn = (link: string, last = false) =>
            window.fs.readdir(link, (err, files) => {
                if (err) {
                    window.logger.error(err);
                    window.dialog.nodeError(err);
                    dispatch(setUnzipping(false));
                    callback(false);
                    return;
                }
                if (files.length <= 0) {
                    window.dialog.customError({
                        title: "No images found",
                        message: "Folder is empty.",
                        detail: link,
                    });
                    dispatch(setUnzipping(false));
                    callback(false);
                    return;
                }
                dispatch(setUnzipping(false));
                if (sendImgs) {
                    dispatch(setLoadingManga(true));
                    dispatch(setLoadingMangaPercent(0));
                }
                const imgs = files.filter((e) => {
                    return window.supportedFormats.includes(window.path.extname(e).toLowerCase());
                });
                if (imgs.length <= 0) {
                    if (
                        !last &&
                        files.length <= 1 &&
                        window.fs.lstatSync(window.path.join(link, files[0])).isDirectory()
                    ) {
                        tempFn(
                            // linkSplitted[linkSplitted.length - 1].replace(/(\.zip|\.cbz)/gi, "")
                            window.path.join(link, files[0]),
                            true
                        );
                        return;
                    }
                    window.dialog.customError({
                        title: "No images found",
                        message: "Folder doesn't contain any supported image format.",
                        log: false,
                    });
                    dispatch(setLoadingManga(true));
                    callback(false);
                    return;
                }
                if (sendImgs) {
                    callback(
                        true,
                        imgs.sort(window.app.betterSortOrder).map((e) => window.path.join(link, e))
                    );
                    return;
                }
                callback(true);
            });
        const linkSplitted = link.split(window.path.sep);
        if ([".zip", ".cbz"].includes(window.path.extname(link))) {
            let tempExtractPath = window.path.join(
                window.electron.app.getPath("temp"),
                `yomikiru-tempImages-${linkSplitted[linkSplitted.length - 1]}-${window.app.randomString(10)}`
            );
            if (window.fs.existsSync(tempExtractPath)) {
                tempExtractPath += "-1";
            }
            // window.fs.mkdirSync(tempExtractPath);
            console.log(`Extracting "${link}" to "${tempExtractPath}"`);
            if (window.fs.existsSync(window.app.deleteDirOnClose))
                window.fs.rmSync(window.app.deleteDirOnClose, {
                    recursive: true,
                });
            window.app.deleteDirOnClose = tempExtractPath;
            dispatch(setUnzipping(true));
            window.crossZip.unzip(link, tempExtractPath, (err) => {
                if (err) {
                    dispatch(setUnzipping(false));

                    return window.dialog.customError({
                        message: "Error while extracting.",
                        detail: err.message,
                        log: false,
                    });
                }
                tempFn(tempExtractPath);
            });
        } else tempFn(link);
    };
    /**
     * Check if folder have images then open those images in reader.
     * @param link link of folder containing images to be opened in reader.
     */
    const openInReader = (link: string, page?: number) => {
        link = window.path.normalize(link);
        if (link === linkInReader.link) return;
        checkValidFolder(
            link,
            (isValid, imgs) => {
                if (isValid && imgs) {
                    window.cachedImageList = {
                        link,
                        images: imgs,
                    };
                    dispatch(setLinkInReader({ link, page: page || 1 }));
                }
            },
            true
        );
    };
    // const updateLastHistoryPageNumber = () => {
    //     if (history.length > 0)
    //         setHistory((init) => {
    //             if (
    //                 (init.length > 0 && init[0] && init[0].link && init[0].link === linkInReader.link) ||
    //                 linkInReader.link === ""
    //             ) {
    //                 init[0].page = window.app.currentPageNumber;
    //                 return [...init];
    //             }
    //             return init;
    //         });
    // };
    const closeReader = () => {
        dispatch(updateLastHistoryPage({ linkInReader: linkInReader.link }));
        dispatch(setReaderOpen(false));
        dispatch(setLinkInReader({ link: "", page: 1 }));
        dispatch(setLoadingManga(false));
        dispatch(setLoadingMangaPercent(0));
        dispatch(setMangaInReader(null));

        document.body.classList.remove("zenMode");
        if (document.fullscreenElement) document.exitFullscreen();
    };

    // todo: check
    const addNewBookmark = (newBk: ChapterItem) => {
        if (newBk) {
            // replace same link with updated pagenumber
            const existingBookmark = bookmarks.findIndex((e) => e.link === newBk.link);
            if (existingBookmark > -1) {
                if (bookmarks[existingBookmark].page === newBk.page)
                    return window.dialog.warn({
                        title: "Bookmark Already Exist",
                        message: "Bookmark Already Exist",
                    });
            }

            dispatch(addBookmark(newBk));
            // setBookmarks((init) => [newBk, ...init]);
        }
    };
    const promptSetDefaultLocation = (): void => {
        const result = window.electron.dialog.showOpenDialogSync(window.electron.getCurrentWindow(), {
            properties: ["openFile", "openDirectory"],
        });
        if (!result) return;
        let path = "";
        if (result) path = window.path.normalize(result[0] + "\\");
        // todo: make better
        dispatch(setAppSettings({ baseDir: path }));
    };
    const openInNewWindow = (link: string) => {
        checkValidFolder(
            link,
            (isValid) => {
                if (isValid) window.electron.ipcRenderer.send("openLinkInNewWindow", link);
            },
            false
        );
    };
    useEffect(() => {
        setFirstRendered(true);
        window.electron.ipcRenderer.on("loadMangaFromLink", (e, data) => {
            if (data && typeof data.link === "string" && data.link !== "") openInReader(data.link);
        });
        window.electron.ipcRenderer.on("setWindowIndex", (e, data) => {
            window.electron.ipcRenderer.send(
                "askBeforeClose",
                window.electron.getCurrentWindow().id,
                appSettings.askBeforeClosing,
                data
            );
        });
        window.electron.ipcRenderer.on("canCheckForUpdate", () => {
            window.electron.ipcRenderer.send(
                "canCheckForUpdate_response",
                appSettings.updateCheckerEnabled,
                window.electron.getCurrentWindow().id,
                appSettings.skipMinorUpdate
            );
        });
        window.electron.ipcRenderer.on("recordPageNumber", () => {
            if (isReaderOpen) closeReader();
        });
        window.app.titleBarHeight = parseFloat(
            window.getComputedStyle(document.body).getPropertyValue("--titleBar-height")
        );
        const eventsOnStart = (e: KeyboardEvent) => {
            if (e.key === "h") {
                if (window.app.isReaderOpen) return closeReader();
                window.location.reload();
            }
        };
        window.addEventListener("keydown", eventsOnStart);
        return () => {
            removeEventListener("keydown", eventsOnStart);
        };
    }, []);

    // todo: join theme inside appsetting
    // useEffect(() => {
    //     if (firstRendered) {
    //         setAppSettings((init) => {
    //             init.theme = theme;
    // return { ...init };
    //         });
    //     }
    // }, [theme]);

    return (
        <AppContext.Provider
            value={{
                pageNumberInputRef,
                openInReader,
                closeReader,
                openInNewWindow,
                checkValidFolder,
                promptSetDefaultLocation,
            }}
        >
            <TopBar />
            <Main />
        </AppContext.Provider>
    );
};
export default App;
