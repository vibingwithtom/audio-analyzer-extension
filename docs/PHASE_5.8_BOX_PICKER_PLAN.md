# Plan: Custom Box File Picker

This document outlines a comprehensive plan to build a lightweight, custom Box file picker for our Svelte application.

**Problem:** The official Box UI Elements library is too heavy and has complex dependencies, making it unsuitable for our lightweight web app.

**Solution:** Build a custom file picker using the Box API and Svelte. This will result in a smaller bundle size and give us full control over the UI.

---

## Phase 5.8.1: Create the `BoxFilePicker.svelte` Component

This will be a new Svelte component that encapsulates all the file picker logic.

**1. Create the component file:**
- `src/components/BoxFilePicker.svelte`

**2. Define the component's props and events:**
- **Props:**
    - `boxAPI`: An instance of the `BoxAPI` service.
    - `initialFolderId`: The ID of the folder to show when the picker is opened (default to "0" for the root folder).
- **Events:**
    - `choose`: Dispatched when the user selects a file. The event detail will be the selected file object from the Box API.
    - `cancel`: Dispatched when the user closes the picker without selecting a file.

**3. Implement the component's UI:**
- A header with the current folder name and a "Close" button.
- A breadcrumb navigation to show the current path and allow navigation to parent folders.
- A list of files and folders in the current folder.
    - Each item in the list should have an icon (folder or file), the name, and the last modified date.
    - Folders should be clickable to navigate into them.
    - Files should be clickable to select them.
- A loading indicator to show when the component is fetching data from the Box API.
- An error message display to show any errors from the Box API.

**4. Implement the component's logic:**
- Use the `onMount` lifecycle function to fetch the initial folder contents.
- Create a `loadFolder(folderId)` function that:
    - Sets the loading state to `true`.
    - Calls the `boxAPI.listFilesInFolder(folderId)` method.
    - Updates the component's state with the fetched files and folders.
    - Sets the loading state to `false`.
- Implement folder navigation:
    - When a folder is clicked, call `loadFolder()` with the folder's ID.
    - Update the breadcrumb navigation.
- Implement file selection:
    - When a file is clicked, dispatch the `choose` event with the file object.
- Implement the "Close" button:
    - Dispatch the `cancel` event.

---

## Phase 5.8.2: Create a `box-api.ts` Service

The `BoxTab.svelte` already has a `boxAPI` object, but it's created inside the component. It would be better to have a dedicated service for the Box API, similar to the `google-drive-api.ts`.

**1. Create the service file:**
- `src/services/box-api.ts`

**2. Implement the `BoxAPI` class:**
- The constructor will take a `BoxAuth` instance.
- `listFilesInFolder(folderId)`: This method will call the Box API to get the contents of a folder. It should handle pagination if necessary.
- `downloadFile(fileId, fileName)`: This method will download a file from Box.
- `downloadFileFromUrl(url)`: This method will parse a Box URL and download the file.

**3. Update `BoxTab.svelte` to use the new service.**

---

## Phase 5.8.3: Integrate the `BoxFilePicker` into `BoxTab.svelte`

**1. Update the `handleBrowseBox` function:**
- Instead of lazy-loading the `BoxContentPicker`, it will now show the `BoxFilePicker.svelte` component.
- The picker can be shown in a modal dialog or an inline container. A modal is probably a better user experience.

**2. Implement the modal dialog:**
- Create a simple `Modal.svelte` component that can be used to show any content in a modal.
- The `BoxTab.svelte` component will use this modal to show the `BoxFilePicker`.

**3. Handle the `choose` and `cancel` events from the `BoxFilePicker`:**
- When the `choose` event is received, the `BoxTab.svelte` component will:
    - Close the modal.
    - Call the `processFile` function with the selected file.
- When the `cancel` event is received, the `BoxTab.svelte` component will:
    - Close the modal.
