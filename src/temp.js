import readFile from "itk/readFile";

import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";
import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
import vtkImageMarchingCubes from "vtk.js/Sources/Filters/General/ImageMarchingCubes";
import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";
import vtkOpenGLRenderWindow from "vtk.js/Sources/Rendering/OpenGL/RenderWindow";
import vtkRenderWindow from "vtk.js/Sources/Rendering/Core/RenderWindow";
import ITKHelper from "vtk.js/Sources/Common/DataModel/ITKHelper";
import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";

const { convertItkToVtkImage } = ITKHelper;

document.querySelector(".inputFile").onchange = function (e) {
    // let file = (<HTMLInputElement>e.target).files[0];
    console.log("inputFile clicked");
    const files = e.target.files;
    if (!files.length) {
        console.warn("cannot find files");
        return;
    }
    readFile(null, files[0]).then(function ({
        image,
        mesh,
        polyData,
        webWorker,
    }) {
        const data = convertItkToVtkImage(image);
        const dataRange = data.getPointData().getScalars().getRange();
        const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;
        const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
            background: [0, 0, 0],
        });
        const renderWindow = fullScreenRenderWindow.getRenderWindow();
        console.log(renderWindow, "renderwindow");

        const renderer = fullScreenRenderWindow.getRenderer();
        const actor = vtkActor.newInstance();
        const mapper = vtkMapper.newInstance();
        const marchingCube = vtkImageMarchingCubes.newInstance({
            contourValue: 0.0,
            computeNormals: true,
            mergePoints: true,
        });
        actor.setMapper(mapper);
        marchingCube.setInputData(data);
        mapper.setInputConnection(marchingCube.getOutputPort());
        marchingCube.setContourValue(firstIsoValue);
        renderer.addActor(actor);
        renderer
            .getActiveCamera()
            .set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
        renderer.resetCamera();
        renderWindow.render();
    });
};

// import readFile from "itk/readFile";

// import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";
// import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
// import vtkImageMarchingCubes from "vtk.js/Sources/Filters/General/ImageMarchingCubes";
// import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";
// import vtkOpenGLRenderWindow from "vtk.js/Sources/Rendering/OpenGL/RenderWindow";
// import vtkRenderWindow from "vtk.js/Sources/Rendering/Core/RenderWindow";
// import ITKHelper from "vtk.js/Sources/Common/DataModel/ITKHelper";
// import vtkHttpDataSetReader from "vtk.js/Sources/IO/Core/HttpDataSetReader";

// const { convertItkToVtkImage } = ITKHelper;

// document.querySelector(".inputFile").onchange = function (e) {
//     // let file = (<HTMLInputElement>e.target).files[0];
//     console.log("inputFile clicked");
//     const files = e.target.files;
//     if (!files.length) {
//         console.warn("cannot find files");
//         return;
//     }
//     console.log(22222, files);
//     readFile(null, files[0]).then(function ({
//         image,
//         mesh,
//         polyData,
//         webWorker,
//     }) {
//         const data = convertItkToVtkImage(image);
//         const dataRange = data.getPointData().getScalars().getRange();
//         const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;
//         // const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
//         //     background: [0, 0, 0],
//         // });
//         // const renderWindow = fullScreenRenderWindow.getRenderWindow();

//         const renderWindowContainer = document.querySelector("#vtkPane");
//         const glwindow = gc.registerResource(
//             vtkOpenGLRenderWindow.newInstance()
//         );
//         glwindow.setContainer(renderWindowContainer);
//         renderWindow.addView(glwindow);
//         glwindow.setSize(400, 400);

//         const renderWindow = vtkRenderWindow.newInstance();
//         const renderer = vtkRenderer.newInstance();

//         renderWindow.addRenderer(renderer);
//         renderer.setBackground(0.32, 0.34, 0.43);

//         console.log(renderWindow, "renderwindow");

//         // const renderer = fullScreenRenderWindow.getRenderer();
//         const actor = vtkActor.newInstance();
//         const mapper = vtkMapper.newInstance();
//         const marchingCube = vtkImageMarchingCubes.newInstance({
//             contourValue: 0.0,
//             computeNormals: true,
//             mergePoints: true,
//         });
//         actor.setMapper(mapper);
//         marchingCube.setInputData(data);
//         mapper.setInputConnection(marchingCube.getOutputPort());
//         marchingCube.setContourValue(firstIsoValue);

//         renderer.addActor(actor);
//         renderer
//             .getActiveCamera()
//             .set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
//         renderer.resetCamera();
//         renderWindow.render();
//     });
// };
