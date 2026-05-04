let Tooltipelements = document.querySelectorAll("[data-bs-toggle='tooltip']");
Tooltipelements.forEach((el) => {
    new bootstrap.Tooltip(el);
});

function reloadTooltip(){
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
    tooltipList.forEach(function (tooltip) {
        tooltip.dispose()
    })

    tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}