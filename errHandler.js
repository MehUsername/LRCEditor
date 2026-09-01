const errDialog = document.getElementById("errDialog"),
    errTitle = document.getElementById("errTitle"),
    errDesc = document.getElementById("errDesc"),
    cancelButton = document.getElementById("cancel"),
    confirmButton = document.getElementById("confirm");
    
let locked = false;
let isConfirm
let waitPressResolve;

function waitForPress() {
    return new Promise(resolve => waitPressResolve = resolve)
}
function buttonResolver() {
    if (waitPressResolve) {
        waitPressResolve();
        isConfirm = (this.id == "confirm");
    }
}
    
function changeLockState() {
    if (!locked) {
        document.body.style.overflow = "hidden";
        locked = true;
    } else {
        document.body.style.overflow = "visible";
        locked = false;
    }
}
    
async function windowAlert(desc) {
    changeLockState();
    
    errTitle.textContent = "Woah there!";
    errDesc.textContent = desc;
    cancelButton.style.display = "none";

    cancelButton.tabIndex = confirmButton.tabIndex = 0;
    
    errDialog.showModal();
    
    confirmButton.addEventListener("click", buttonResolver, {once: true});
    await waitForPress();

    cancelButton.tabIndex = confirmButton.tabIndex = -1;
    errDialog.close();
    
    changeLockState();
}

async function windowConfirm(desc) {
    changeLockState();
    
    cancelButton.style.display = "flex";
    errTitle.textContent = "You sure?";
    errDesc.textContent = desc;

    cancelButton.tabIndex = confirmButton.tabIndex = 0;
    
    errDialog.showModal();
    
    confirmButton.addEventListener("click", buttonResolver);
    cancelButton.addEventListener("click", buttonResolver);
    
    await waitForPress();
    
    confirmButton.removeEventListener("click", buttonResolver);
    cancelButton.removeEventListener("click", buttonResolver);
    
    cancelButton.tabIndex = confirmButton.tabIndex = -1;
    errDialog.close();
    
    changeLockState();
    
    return new Promise(resolve => resolve(isConfirm));
}
