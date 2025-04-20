import {ReactElement} from "react";
import InputCheckbox from "../Element/InputCheckbox";
import {setAppSettings} from "../../store/appSettings";
import {useAppDispatch, useAppSelector} from "../../store/hooks";

export default function ExtraExtraSettings() : ReactElement {
  const appSettings = useAppSelector((store) => store.appSettings);
  const dispatch = useAppDispatch();

  return (
    <>
      <div className="content2">
        <div className="settingItem2">
          <h3>Extra Extra Settings</h3>
          <div className="main col">
            <InputCheckbox
              checked={appSettings.disableUpdates}
              className="noBG"
              onChange={(e) => {
                dispatch(setAppSettings({ disableUpdates: e.currentTarget.checked }));
                dispatch(setAppSettings({ skipMinorUpdate: e.currentTarget.checked }));
                dispatch(setAppSettings({ autoDownloadUpdate: e.currentTarget.checked }));
              }}
              title="Toggling this prevents updates."
              paraAfter="Disable Updates"
            />
            <div>
              Note: There will be no checks if you toggle disable updates.
            </div>
            <button
              onClick={() => {
                window.electron.ipcRenderer.send(
                  "checkForUpdate",
                  window.electron.getCurrentWindow().id,
                  true
                );
              }}
            >
              Check for Update Now
            </button>
          </div>
        </div>
      </div>
    </>
  )
}