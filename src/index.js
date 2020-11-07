import readFile from "itk/readFile";

import vtkActor from "vtk.js/Sources/Rendering/Core/Actor";
import vtkWidgetManager from "vtk.js/Sources/Widgets/Core/WidgetManager";
import vtkFullScreenRenderWindow from "vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow";
import vtkOrientationMarkerWidget from "vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "vtk.js/Sources/Rendering/Core/AnnotatedCubeActor";
import vtkImageMarchingCubes from "vtk.js/Sources/Filters/General/ImageMarchingCubes";
import vtkMapper from "vtk.js/Sources/Rendering/Core/Mapper";
import vtkOpenGLRenderWindow from "vtk.js/Sources/Rendering/OpenGL/RenderWindow";
import vtkRenderWindow from "vtk.js/Sources/Rendering/Core/RenderWindow";
import ITKHelper from "vtk.js/Sources/Common/DataModel/ITKHelper";
import vtkRenderer from "vtk.js/Sources/Rendering/Core/Renderer";
import vtkRenderWindowInteractor from "vtk.js/Sources/Rendering/Core/RenderWindowInteractor";
import vtkInteractorStyleTrackballCamera from "vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera";

const { convertItkToVtkImage } = ITKHelper;

document.querySelector(".inputFile").onchange = function (e) {
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

        const renderWindow = vtkRenderWindow.newInstance();
        const renderWindowContainer = document.querySelector("#vtkPane1");
        const glwindow = vtkOpenGLRenderWindow.newInstance();
        glwindow.setContainer(renderWindowContainer);
        renderWindow.addView(glwindow);

        let interactor = vtkRenderWindowInteractor.newInstance();
        interactor.setInteractorStyle(
            vtkInteractorStyleTrackballCamera.newInstance()
        );
        interactor.setView(glwindow);
        interactor.initialize();
        interactor.bindEvents(renderWindowContainer);

        const renderer = vtkRenderer.newInstance();
        renderWindow.addRenderer(renderer);
        renderer.setBackground(0, 0, 0);

        const axes = vtkAnnotatedCubeActor.newInstance();
        axes.setDefaultStyle({
            fontStyle: "bold",
            fontFamily: "Arial",
            fontColor: "black",
            fontSizeScale: (res) => res / 2,
            faceColor: "#0000ff",
            faceRotation: 0,
            edgeThickness: 0.1,
            edgeColor: "black",
            resolution: 400,
        });

        axes.setXPlusFaceProperty({ text: "L" });
        axes.setXMinusFaceProperty({
            text: "R",
            faceColor: "#ffff00",
            faceRotation: 90,
            fontStyle: "italic",
        });
        axes.setYPlusFaceProperty({
            text: "P",
            faceColor: "#00ff00",
            fontSizeScale: (res) => res / 4,
        });
        axes.setYMinusFaceProperty({
            text: "A",
            faceColor: "#00ffff",
            fontColor: "white",
        });
        axes.setZPlusFaceProperty({
            text: "S",
            edgeColor: "yellow",
        });
        axes.setZMinusFaceProperty({
            text: "I",
            faceRotation: 45,
            edgeThickness: 0,
        });

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

        const orientationWidget = vtkOrientationMarkerWidget.newInstance({
            actor: axes,
            interactor: renderWindow.getInteractor(),
        });
        orientationWidget.setEnabled(true);
        orientationWidget.setViewportCorner(
            vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
        );
        orientationWidget.setViewportSize(0.15);
        orientationWidget.setMinPixelSize(50);
        orientationWidget.setMaxPixelSize(50);

        renderWindow.render();
    });
};
